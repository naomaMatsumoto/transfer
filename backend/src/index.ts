import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPool } from "mysql2/promise";
import logger from "./logger";

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.path.startsWith("/admin")) logger.info(`${req.method} ${req.path}`);
  next();
});

const pool = createPool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "makeup_app",
  waitForConnections: true,
  connectionLimit: 10,
});

// Error codes (messages are resolved on frontend)
const ERR = {
  EVENTS_FROM_TO_REQUIRED: "EVENTS_FROM_TO_REQUIRED",
  USER_ID_REQUIRED: "USER_ID_REQUIRED",
  USER_ID_EVENT_ID_REQUIRED: "USER_ID_EVENT_ID_REQUIRED",
  EVENT_NOT_FOUND: "EVENT_NOT_FOUND",
  RESERVATION_PARAMS_REQUIRED: "RESERVATION_PARAMS_REQUIRED",
  EVENT_NOT_BOOKABLE: "EVENT_NOT_BOOKABLE",
  EVENT_CAPACITY_FULL: "EVENT_CAPACITY_FULL",
  EVENT_CAPACITY_FULL_OVERRIDE: "EVENT_CAPACITY_FULL_OVERRIDE",
  RESERVATION_ALREADY_EXISTS: "RESERVATION_ALREADY_EXISTS",
  MAKEUP_CREDIT_ID_REQUIRED: "MAKEUP_CREDIT_ID_REQUIRED",
  MAKEUP_CREDIT_NOT_AVAILABLE: "MAKEUP_CREDIT_NOT_AVAILABLE",
  CLASS_TYPE_NAME_REQUIRED: "CLASS_TYPE_NAME_REQUIRED",
  CLASS_TYPE_CODE_DUPLICATE: "CLASS_TYPE_CODE_DUPLICATE",
  CLASS_TYPE_NAME_EMPTY: "CLASS_TYPE_NAME_EMPTY",
  CLASS_TYPE_UPDATE_EMPTY: "CLASS_TYPE_UPDATE_EMPTY",
  CLASS_TYPE_NOT_FOUND: "CLASS_TYPE_NOT_FOUND",
  CLASS_TYPE_IN_USE: "CLASS_TYPE_IN_USE",
  EVENT_CREATE_PARAMS_REQUIRED: "EVENT_CREATE_PARAMS_REQUIRED",
  EVENT_BULK_PARAMS_REQUIRED: "EVENT_BULK_PARAMS_REQUIRED",
  EVENT_DELETE_HAS_RESERVATIONS: "EVENT_DELETE_HAS_RESERVATIONS",
  EVENT_IDS_REQUIRED: "EVENT_IDS_REQUIRED",
  EVENT_BULK_DELETE_HAS_RESERVATIONS: "EVENT_BULK_DELETE_HAS_RESERVATIONS",
  EVENT_BULK_STATUS_PARAMS_REQUIRED: "EVENT_BULK_STATUS_PARAMS_REQUIRED",
  EVENT_STATUS_INVALID: "EVENT_STATUS_INVALID",
  EVENT_BULK_CAPACITY_PARAMS_REQUIRED: "EVENT_BULK_CAPACITY_PARAMS_REQUIRED",
  EVENT_BULK_TIME_PARAMS_REQUIRED: "EVENT_BULK_TIME_PARAMS_REQUIRED",
  EVENT_TIME_PARAMS_REQUIRED: "EVENT_TIME_PARAMS_REQUIRED",
  EVENT_CAPACITY_INVALID: "EVENT_CAPACITY_INVALID",
  CREDIT_USER_ID_REQUIRED: "CREDIT_USER_ID_REQUIRED",
  CREDIT_UPDATE_EMPTY: "CREDIT_UPDATE_EMPTY",
  CREDIT_NOT_FOUND: "CREDIT_NOT_FOUND",
  RESERVATION_NOT_FOUND: "RESERVATION_NOT_FOUND",
  RESERVATION_CANCEL_NOT_BOOKED: "RESERVATION_CANCEL_NOT_BOOKED",
  MEMBER_NAME_REQUIRED: "MEMBER_NAME_REQUIRED",
  MEMBER_NAME_EMPTY: "MEMBER_NAME_EMPTY",
  MEMBER_EMAIL_INVALID: "MEMBER_EMAIL_INVALID",
  MEMBER_EMAIL_DUPLICATE: "MEMBER_EMAIL_DUPLICATE",
  MEMBER_UPDATE_EMPTY: "MEMBER_UPDATE_EMPTY",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",
  MEMBER_DELETE_HAS_REFERENCES: "MEMBER_DELETE_HAS_REFERENCES",
} as const;

// ヘルスチェック
app.get(
  "/health",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.query("SELECT 1");
      res.json({ status: "ok", db: rows });
    } catch (err) {
      next(err);
    }
  },
);

// カレンダー用：イベント一覧（期間指定）
app.get(
  "/events",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to, userId } = req.query;

      if (!from || !to) {
        return res.status(400).json({ error: ERR.EVENTS_FROM_TO_REQUIRED });
      }

      const userIdNum = userId ? Number(userId) : 0;

      const [rows] = await pool.query(
        `
        SELECT
          e.id,
          e.class_type_id,
          ct.name AS class_type_name,
          e.starts_at,
          e.ends_at,
          e.capacity,
          e.status AS event_status,
          COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count,
          MAX(CASE WHEN r.user_id = ? AND r.status IN ('booked','attended') THEN 1 ELSE 0 END) AS is_reserved_by_user
        FROM events e
        LEFT JOIN reservations r ON r.event_id = e.id
        LEFT JOIN class_types ct ON ct.id = e.class_type_id
        WHERE e.starts_at BETWEEN ? AND ?
        GROUP BY e.id
        ORDER BY e.starts_at ASC
      `,
        [userIdNum, from, to],
      );

      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// 振替権利一覧
app.get(
  "/makeup-credits",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.query;
      const userIdNum = Number(userId);
      if (!userIdNum) {
        return res.status(400).json({ error: ERR.USER_ID_REQUIRED });
      }

      const [rows] = await pool.query(
        `
        SELECT
          id,
          user_id,
          class_type_id,
          granted_at,
          expires_at,
          status,
          source,
          source_event_id,
          note
        FROM makeup_credits
        WHERE user_id = ? AND status = 'granted'
        ORDER BY granted_at ASC
      `,
        [userIdNum],
      );

      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// 欠席登録 → 振替権利付与（シンプル版）
app.post(
  "/absences",
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, eventId, reason } = req.body as {
      userId?: number;
      eventId?: number;
      reason?: string;
    };

    if (!userId || !eventId) {
      return res.status(400).json({ error: ERR.USER_ID_EVENT_ID_REQUIRED });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // イベント取得（クラス種別など）
      const [events] = await conn.query(
        "SELECT id, class_type_id FROM events WHERE id = ? FOR UPDATE",
        [eventId],
      );
      const eventRow = (events as any[])[0];
      if (!eventRow) {
        await conn.rollback();
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }

      // 振替権利を付与（有効期限などは後でルール追加）
      const [result] = await conn.query(
        `
        INSERT INTO makeup_credits
          (user_id, class_type_id, granted_at, status, source, source_event_id, note)
        VALUES (?, ?, NOW(), 'granted', 'absence', ?, ?)
      `,
        [userId, eventRow.class_type_id, eventId, reason ?? null],
      );

      await conn.commit();

      res.status(201).json({
        id: (result as any).insertId,
        userId,
        eventId,
        classTypeId: eventRow.class_type_id,
      });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// 予約作成（通常 / 振替）
app.post(
  "/reservations",
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, eventId, reservationType, makeupCreditId } = req.body as {
      userId?: number;
      eventId?: number;
      reservationType?: "normal" | "makeup";
      makeupCreditId?: number | null;
    };

    if (!userId || !eventId || !reservationType) {
      return res.status(400).json({ error: ERR.RESERVATION_PARAMS_REQUIRED });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // イベント情報 + 現在の予約数
      const [eventRows] = await conn.query(
        `
        SELECT
          e.id,
          e.capacity,
          e.status,
          e.starts_at,
          e.ends_at,
          COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
        FROM events e
        LEFT JOIN reservations r ON r.event_id = e.id
        WHERE e.id = ?
        GROUP BY e.id
        FOR UPDATE
      `,
        [eventId],
      );
      const event = (eventRows as any[])[0];
      if (!event) {
        await conn.rollback();
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }
      if (event.status !== "scheduled") {
        await conn.rollback();
        return res.status(400).json({ error: ERR.EVENT_NOT_BOOKABLE });
      }
      if (event.reserved_count >= event.capacity) {
        await conn.rollback();
        return res.status(400).json({ error: ERR.EVENT_CAPACITY_FULL });
      }

      // 同一枠の重複予約防止
      const [existing] = await conn.query(
        `
        SELECT id FROM reservations
        WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended')
        FOR UPDATE
      `,
        [userId, eventId],
      );
      if ((existing as any[]).length > 0) {
        await conn.rollback();
        return res.status(400).json({ error: ERR.RESERVATION_ALREADY_EXISTS });
      }

      let makeupIdToUse: number | null = null;

      if (reservationType === "makeup") {
        if (!makeupCreditId) {
          await conn.rollback();
          return res.status(400).json({ error: ERR.MAKEUP_CREDIT_ID_REQUIRED });
        }

        const [credits] = await conn.query(
          `
          SELECT id, status FROM makeup_credits
          WHERE id = ? AND user_id = ? FOR UPDATE
        `,
          [makeupCreditId, userId],
        );
        const credit = (credits as any[])[0];
        if (!credit || credit.status !== "granted") {
          await conn.rollback();
          return res.status(400).json({ error: ERR.MAKEUP_CREDIT_NOT_AVAILABLE });
        }
        makeupIdToUse = credit.id;
      }

      const [result] = await conn.query(
        `
        INSERT INTO reservations
          (user_id, event_id, reservation_type, makeup_credit_id, status, created_at)
        VALUES (?, ?, ?, ?, 'booked', NOW())
      `,
        [userId, eventId, reservationType, makeupIdToUse],
      );
      const reservationId = (result as any).insertId;

      if (reservationType === "makeup" && makeupIdToUse) {
        await conn.query(
          `
          UPDATE makeup_credits
          SET status = 'consumed', updated_at = NOW()
          WHERE id = ?
        `,
          [makeupIdToUse],
        );
      }

      await conn.commit();

      res.status(201).json({
        id: reservationId,
        userId,
        eventId,
        reservationType,
        makeupCreditId: makeupIdToUse,
      });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// ================================================================
// Admin API
// ================================================================

// --- ユーザー一覧（プルダウン用・会員管理） ---
app.get(
  "/admin/users",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users ORDER BY id ASC",
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// --- 会員 作成 ---
const STAGE_VALUES = ["preschool", "elementary", "junior_high", "high_school", "other"] as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(s: string): boolean {
  return s.length > 0 && s.length <= 255 && EMAIL_REGEX.test(s);
}
app.post(
  "/admin/users",
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, furigana, email, address, phone, course_type, stage } = req.body as {
      name?: string;
      furigana?: string | null;
      email?: string;
      address?: string | null;
      phone?: string | null;
      course_type?: string | null;
      stage?: string;
    };
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: ERR.MEMBER_NAME_REQUIRED });
    }
    const trimmedName = String(name).trim();
    const furiganaVal = furigana != null && String(furigana).trim() !== "" ? String(furigana).trim() : null;
    const emailTrimmed = email != null && String(email).trim() !== "" ? String(email).trim() : null;
    if (emailTrimmed !== null && !isValidEmail(emailTrimmed)) {
      return res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
    }
    const addressVal = address != null && String(address).trim() !== "" ? String(address).trim() : null;
    const phoneVal = phone != null && String(phone).trim() !== "" ? String(phone).trim() : null;
    const stageVal = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
    try {
      const [result] = await pool.query(
        "INSERT INTO users (name, furigana, email, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [trimmedName, furiganaVal, emailTrimmed, addressVal, phoneVal, course_type ?? null, stageVal],
      );
      res.status(201).json({
        id: (result as any).insertId,
        name: trimmedName,
        furigana: furiganaVal,
        email: emailTrimmed,
        address: addressVal,
        phone: phoneVal,
        course_type: course_type ?? null,
        stage: stageVal,
      });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      }
      next(err);
    }
  },
);

// --- 会員 更新 ---
app.patch(
  "/admin/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const { name, furigana, email, address, phone, course_type, stage } = req.body as {
      name?: string;
      furigana?: string | null;
      email?: string;
      address?: string | null;
      phone?: string | null;
      course_type?: string | null;
      stage?: string;
    };
    const updates: string[] = [];
    const params: any[] = [];
    if (name !== undefined) {
      const v = String(name).trim();
      if (v.length === 0) return res.status(400).json({ error: ERR.MEMBER_NAME_EMPTY });
      updates.push("name = ?"); params.push(v);
    }
    if (furigana !== undefined) {
      updates.push("furigana = ?"); params.push(furigana == null || String(furigana).trim() === "" ? null : String(furigana).trim());
    }
    if (address !== undefined) {
      updates.push("address = ?"); params.push(address == null || String(address).trim() === "" ? null : String(address).trim());
    }
    if (phone !== undefined) {
      updates.push("phone = ?"); params.push(phone == null || String(phone).trim() === "" ? null : String(phone).trim());
    }
    if (email !== undefined) {
      const v = String(email).trim();
      const emailVal = v === "" ? null : v;
      if (emailVal !== null && !isValidEmail(emailVal)) {
        return res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
      }
      updates.push("email = ?"); params.push(emailVal);
    }
    if (course_type !== undefined) { updates.push("course_type = ?"); params.push(course_type === null || course_type === "" ? null : course_type); }
    if (stage !== undefined) {
      const v = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
      updates.push("stage = ?"); params.push(v);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: ERR.MEMBER_UPDATE_EMPTY });
    }
    params.push(id);
    try {
      const [result] = await pool.query(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
        params,
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
      }
      res.json({ id, updated: true });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      }
      next(err);
    }
  },
);

// --- 会員 削除 ---
app.delete(
  "/admin/users/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    try {
      const [refCredits] = await pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
      const [refRes] = await pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
      if ((refCredits as any[]).length > 0 || (refRes as any[]).length > 0) {
        return res.status(400).json({ error: ERR.MEMBER_DELETE_HAS_REFERENCES });
      }
      const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
      }
      res.json({ id, deleted: true });
    } catch (err) {
      next(err);
    }
  },
);

// --- クラス種別一覧 ---
app.get(
  "/admin/class-types",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, code, name, description FROM class_types ORDER BY id ASC",
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// コード未指定時用の一意なコードを生成（名前のスラッグ or ct_タイムスタンプ）
function generateClassTypeCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff-]/g, "");
  if (slug.length > 0 && slug.length <= 50) return slug;
  return `ct_${Date.now()}`;
}

// --- クラス種別 作成 ---
app.post(
  "/admin/class-types",
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, name, description } = req.body as {
      code?: string;
      name?: string;
      description?: string;
    };
    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: ERR.CLASS_TYPE_NAME_REQUIRED });
    }
    const trimmedName = String(name).trim();
    const codeToUse = code && String(code).trim() ? String(code).trim() : generateClassTypeCode(trimmedName);
    try {
      const [result] = await pool.query(
        "INSERT INTO class_types (code, name, description) VALUES (?, ?, ?)",
        [codeToUse, trimmedName, description ?? null],
      );
      res.status(201).json({ id: (result as any).insertId, code: codeToUse, name: trimmedName });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      }
      next(err);
    }
  },
);

// --- クラス種別 更新 ---
app.patch(
  "/admin/class-types/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    const { code, name, description } = req.body as {
      code?: string;
      name?: string;
      description?: string;
    };
    const sets: string[] = [];
    const params: any[] = [];
    if (code !== undefined) { sets.push("code = ?"); params.push(String(code).trim()); }
    if (name !== undefined) {
      const v = String(name).trim();
      if (v.length === 0) return res.status(400).json({ error: ERR.CLASS_TYPE_NAME_EMPTY });
      sets.push("name = ?"); params.push(v);
    }
    if (description !== undefined) { sets.push("description = ?"); params.push(description); }
    if (sets.length === 0) {
      return res.status(400).json({ error: ERR.CLASS_TYPE_UPDATE_EMPTY });
    }
    params.push(id);
    try {
      const [result] = await pool.query(
        `UPDATE class_types SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      }
      res.json({ id, updated: true });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      }
      next(err);
    }
  },
);

// --- クラス種別 削除 ---
app.delete(
  "/admin/class-types/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const id = Number(req.params.id);
    try {
      const [result] = await pool.query(
        "DELETE FROM class_types WHERE id = ?",
        [id],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      }
      res.json({ id, deleted: true });
    } catch (err: any) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({ error: ERR.CLASS_TYPE_IN_USE });
      }
      next(err);
    }
  },
);

// --- イベント一覧（admin用・全ステータス） ---
app.get(
  "/admin/events",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { from, to } = req.query;
      let where = "";
      const params: any[] = [];
      if (from && to) {
        where = "WHERE e.starts_at BETWEEN ? AND ?";
        params.push(from, to);
      }
      const [rows] = await pool.query(
        `
        SELECT
          e.id,
          e.class_type_id,
          ct.name AS class_type_name,
          e.starts_at,
          e.ends_at,
          e.capacity,
          e.status,
          COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
        FROM events e
        LEFT JOIN reservations r ON r.event_id = e.id
        LEFT JOIN class_types ct ON ct.id = e.class_type_id
        ${where}
        GROUP BY e.id
        ORDER BY e.starts_at ASC
      `,
        params,
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント作成（通常枠追加） ---
app.post(
  "/admin/events",
  async (req: Request, res: Response, next: NextFunction) => {
    const { classTypeId, startsAt, endsAt, capacity } = req.body as {
      classTypeId?: number;
      startsAt?: string;
      endsAt?: string;
      capacity?: number;
    };
    if (!classTypeId || !startsAt || !endsAt) {
      return res.status(400).json({ error: ERR.EVENT_CREATE_PARAMS_REQUIRED });
    }
    try {
      const [result] = await pool.query(
        `INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [classTypeId, startsAt, endsAt, capacity ?? 6],
      );
      res.status(201).json({ id: (result as any).insertId });
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント一括作成（曜日×期間×時間帯で繰り返し登録） ---
app.post(
  "/admin/events/bulk",
  async (req: Request, res: Response, next: NextFunction) => {
    const { classTypeId, startTime, endTime, capacity, weekdays, dateFrom, dateTo, excludeDates } =
      req.body as {
        classTypeId?: number;
        startTime?: string;   // "16:00"
        endTime?: string;     // "17:00"
        capacity?: number;
        weekdays?: number[];  // 0=日, 1=月, ... 6=土
        dateFrom?: string;    // "2026-02-01"
        dateTo?: string;      // "2026-03-31"
        excludeDates?: string[]; // ["2026-02-11"] 除外日
      };

    if (!classTypeId || !startTime || !endTime || !weekdays || weekdays.length === 0 || !dateFrom || !dateTo) {
      return res.status(400).json({ error: ERR.EVENT_BULK_PARAMS_REQUIRED });
    }

    const excludeSet = new Set(excludeDates ?? []);
    const created: { id: number; date: string }[] = [];

    try {
      const cursor = new Date(dateFrom + "T00:00:00");
      const end = new Date(dateTo + "T00:00:00");

      while (cursor <= end) {
        const day = cursor.getDay(); // 0=日〜6=土（ローカル）
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        const dateStr = `${y}-${m}-${d}`; // ローカル日付（toISOString は UTC で日曜/土曜がずれるため使わない）

        if (weekdays.includes(day) && !excludeSet.has(dateStr)) {
          const startsAt = `${dateStr} ${startTime}:00`;
          const endsAt = `${dateStr} ${endTime}:00`;

          const [result] = await pool.query(
            `INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status)
             VALUES (?, ?, ?, ?, 'scheduled')`,
            [classTypeId, startsAt, endsAt, capacity ?? 6],
          );
          created.push({ id: (result as any).insertId, date: dateStr });
        }

        cursor.setDate(cursor.getDate() + 1);
      }

      res.status(201).json({
        count: created.length,
        events: created,
      });
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント削除 ---
app.delete(
  "/admin/events/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const eventId = Number(req.params.id);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 予約が残っていないかチェック
      const [reservations] = await conn.query(
        "SELECT id FROM reservations WHERE event_id = ? AND status IN ('booked','attended')",
        [eventId],
      );
      if ((reservations as any[]).length > 0) {
        await conn.rollback();
        return res.status(400).json({
          error: ERR.EVENT_DELETE_HAS_RESERVATIONS,
          count: (reservations as any[]).length,
        });
      }

      // キャンセル済み予約があれば削除
      await conn.query(
        "DELETE FROM reservations WHERE event_id = ?",
        [eventId],
      );

      // 振替権利の参照を外す
      await conn.query(
        "UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id = ?",
        [eventId],
      );

      const [result] = await conn.query(
        "DELETE FROM events WHERE id = ?",
        [eventId],
      );
      if ((result as any).affectedRows === 0) {
        await conn.rollback();
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }

      await conn.commit();
      res.json({ id: eventId, deleted: true });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// --- イベント一括削除 ---
app.post(
  "/admin/events/bulk-delete",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids } = req.body as { ids?: number[] };
    if (!ids || ids.length === 0) {
      return res.status(400).json({ error: ERR.EVENT_IDS_REQUIRED });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 有効な予約があるイベントをチェック
      const placeholders = ids.map(() => "?").join(",");
      const [activeRes] = await conn.query(
        `SELECT event_id, COUNT(*) AS cnt FROM reservations
         WHERE event_id IN (${placeholders}) AND status IN ('booked','attended')
         GROUP BY event_id`,
        ids,
      );
      const activeEvents = activeRes as any[];
      if (activeEvents.length > 0) {
        await conn.rollback();
        return res.status(400).json({
          error: ERR.EVENT_BULK_DELETE_HAS_RESERVATIONS,
          details: activeEvents.map((r: any) => ({ eventId: r.event_id, count: r.cnt })),
        });
      }

      // キャンセル済み予約を削除
      await conn.query(
        `DELETE FROM reservations WHERE event_id IN (${placeholders})`,
        ids,
      );

      // 振替権利の参照を外す
      await conn.query(
        `UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (${placeholders})`,
        ids,
      );

      // イベント削除
      const [result] = await conn.query(
        `DELETE FROM events WHERE id IN (${placeholders})`,
        ids,
      );

      await conn.commit();
      res.json({ deleted: (result as any).affectedRows });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// --- イベント一括ステータス変更 ---
app.post(
  "/admin/events/bulk-status",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids, status } = req.body as {
      ids?: number[];
      status?: "scheduled" | "canceled_by_admin" | "holiday";
    };
    if (!ids || ids.length === 0 || !status) {
      return res.status(400).json({ error: ERR.EVENT_BULK_STATUS_PARAMS_REQUIRED });
    }
    if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
      return res.status(400).json({ error: ERR.EVENT_STATUS_INVALID });
    }
    try {
      const placeholders = ids.map(() => "?").join(",");
      const [result] = await pool.query(
        `UPDATE events SET status = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
        [status, ...ids],
      );
      res.json({ updated: (result as any).affectedRows, status });
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント一括定員変更 ---
app.post(
  "/admin/events/bulk-capacity",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids, capacity } = req.body as { ids?: number[]; capacity?: number };
    if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
      return res.status(400).json({ error: ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED });
    }
    try {
      const placeholders = ids.map(() => "?").join(",");
      const [result] = await pool.query(
        `UPDATE events SET capacity = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
        [capacity, ...ids],
      );
      res.json({ updated: (result as any).affectedRows, capacity });
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント一括時間変更（時刻部分だけ変更、日付はそのまま） ---
app.post(
  "/admin/events/bulk-time",
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids, startTime, endTime } = req.body as {
      ids?: number[];
      startTime?: string; // "16:00"
      endTime?: string;   // "17:00"
    };
    if (!ids || ids.length === 0 || !startTime || !endTime) {
      return res.status(400).json({ error: ERR.EVENT_BULK_TIME_PARAMS_REQUIRED });
    }
    try {
      let updated = 0;
      for (const id of ids) {
        const [rows] = await pool.query(
          "SELECT starts_at, ends_at FROM events WHERE id = ?",
          [id],
        );
        const row = (rows as any[])[0];
        if (!row) continue;
        // 日付部分を保持して時刻だけ差し替え
        const dateStr = new Date(row.starts_at).toISOString().slice(0, 10);
        const newStart = `${dateStr} ${startTime}:00`;
        const newEnd = `${dateStr} ${endTime}:00`;
        await pool.query(
          "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
          [newStart, newEnd, id],
        );
        updated++;
      }
      res.json({ updated, startTime, endTime });
    } catch (err) {
      next(err);
    }
  },
);

// --- 休講日 / 通常休み登録（イベントのステータス変更） ---
app.patch(
  "/admin/events/:id/status",
  async (req: Request, res: Response, next: NextFunction) => {
    const eventId = Number(req.params.id);
    const { status } = req.body as {
      status?: "scheduled" | "canceled_by_admin" | "holiday";
    };
    if (!status || !["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
      return res.status(400).json({ error: ERR.EVENT_STATUS_INVALID });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }
      res.json({ id: eventId, status });
    } catch (err) {
      next(err);
    }
  },
);

// --- イベント時間変更 ---
app.patch(
  "/admin/events/:id/time",
  async (req: Request, res: Response, next: NextFunction) => {
    const eventId = Number(req.params.id);
    const { startsAt, endsAt } = req.body as { startsAt?: string; endsAt?: string };
    if (!startsAt || !endsAt) {
      return res.status(400).json({ error: ERR.EVENT_TIME_PARAMS_REQUIRED });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
        [startsAt, endsAt, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }
      res.json({ id: eventId, startsAt, endsAt });
    } catch (err) {
      next(err);
    }
  },
);

// --- 定員調整 ---
app.patch(
  "/admin/events/:id/capacity",
  async (req: Request, res: Response, next: NextFunction) => {
    const eventId = Number(req.params.id);
    const { capacity } = req.body as { capacity?: number };
    if (capacity == null || capacity < 0) {
      return res.status(400).json({ error: ERR.EVENT_CAPACITY_INVALID });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET capacity = ?, updated_at = NOW() WHERE id = ?",
        [capacity, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }
      res.json({ id: eventId, capacity });
    } catch (err) {
      next(err);
    }
  },
);

// --- 振替権利一覧（admin: 全ユーザー / ステータス絞り込み） ---
app.get(
  "/admin/makeup-credits",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, status } = req.query;
      const conditions: string[] = [];
      const params: any[] = [];
      if (userId) {
        conditions.push("mc.user_id = ?");
        params.push(Number(userId));
      }
      if (status) {
        conditions.push("mc.status = ?");
        params.push(status);
      }
      const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
      const [rows] = await pool.query(
        `
        SELECT
          mc.id,
          mc.user_id,
          u.name AS user_name,
          mc.class_type_id,
          ct.name AS class_type_name,
          mc.granted_at,
          mc.expires_at,
          mc.status,
          mc.source,
          mc.source_event_id,
          mc.note,
          mc.created_by
        FROM makeup_credits mc
        LEFT JOIN users u ON u.id = mc.user_id
        LEFT JOIN class_types ct ON ct.id = mc.class_type_id
        ${where}
        ORDER BY mc.granted_at DESC
      `,
        params,
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// --- 振替権利の手動付与 ---
app.post(
  "/admin/makeup-credits",
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, classTypeId, expiresAt, note, createdBy } = req.body as {
      userId?: number;
      classTypeId?: number | null;
      expiresAt?: string | null;
      note?: string;
      createdBy?: string;
    };
    if (!userId) {
      return res.status(400).json({ error: ERR.CREDIT_USER_ID_REQUIRED });
    }
    try {
      const [result] = await pool.query(
        `INSERT INTO makeup_credits
          (user_id, class_type_id, granted_at, expires_at, status, source, note, created_by)
         VALUES (?, ?, NOW(), ?, 'granted', 'admin_holiday', ?, ?)`,
        [
          userId,
          classTypeId ?? null,
          expiresAt ?? null,
          note ?? null,
          createdBy ?? "admin",
        ],
      );
      res.status(201).json({ id: (result as any).insertId });
    } catch (err) {
      next(err);
    }
  },
);

// --- 振替権利の更新（期限変更・ステータス変更） ---
app.patch(
  "/admin/makeup-credits/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const creditId = Number(req.params.id);
    const { status, expiresAt, note } = req.body as {
      status?: "granted" | "consumed" | "revoked";
      expiresAt?: string | null;
      note?: string;
    };
    const sets: string[] = [];
    const params: any[] = [];
    if (status) {
      sets.push("status = ?");
      params.push(status);
    }
    if (expiresAt !== undefined) {
      sets.push("expires_at = ?");
      params.push(expiresAt);
    }
    if (note !== undefined) {
      sets.push("note = ?");
      params.push(note);
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: ERR.CREDIT_UPDATE_EMPTY });
    }
    sets.push("updated_at = NOW()");
    params.push(creditId);
    try {
      const [result] = await pool.query(
        `UPDATE makeup_credits SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
      }
      res.json({ id: creditId, updated: true });
    } catch (err) {
      next(err);
    }
  },
);

// --- 振替権利の削除（revoke） ---
app.delete(
  "/admin/makeup-credits/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    const creditId = Number(req.params.id);
    try {
      const [result] = await pool.query(
        "UPDATE makeup_credits SET status = 'revoked', updated_at = NOW() WHERE id = ?",
        [creditId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
      }
      res.json({ id: creditId, status: "revoked" });
    } catch (err) {
      next(err);
    }
  },
);

// --- 振替予約の代理操作（admin が代わりに予約） ---
app.post(
  "/admin/reservations",
  async (req: Request, res: Response, next: NextFunction) => {
    const { userId, eventId, reservationType, makeupCreditId, overrideCapacity } =
      req.body as {
        userId?: number;
        eventId?: number;
        reservationType?: "normal" | "makeup";
        makeupCreditId?: number | null;
        overrideCapacity?: boolean; // 特例承認（定員超過OK）
      };

    if (!userId || !eventId || !reservationType) {
      return res.status(400).json({ error: ERR.RESERVATION_PARAMS_REQUIRED });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [eventRows] = await conn.query(
        `
        SELECT
          e.id, e.capacity, e.status,
          COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
        FROM events e
        LEFT JOIN reservations r ON r.event_id = e.id
        WHERE e.id = ?
        GROUP BY e.id
        FOR UPDATE
      `,
        [eventId],
      );
      const event = (eventRows as any[])[0];
      if (!event) {
        await conn.rollback();
        return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      }

      // 特例承認でなければ定員チェック
      if (!overrideCapacity && event.reserved_count >= event.capacity) {
        await conn.rollback();
        return res.status(400).json({ error: ERR.EVENT_CAPACITY_FULL_OVERRIDE });
      }

      // 重複チェック
      const [existing] = await conn.query(
        "SELECT id FROM reservations WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended') FOR UPDATE",
        [userId, eventId],
      );
      if ((existing as any[]).length > 0) {
        await conn.rollback();
        return res.status(400).json({ error: ERR.RESERVATION_ALREADY_EXISTS });
      }

      let makeupIdToUse: number | null = null;
      if (reservationType === "makeup" && makeupCreditId) {
        const [credits] = await conn.query(
          "SELECT id, status FROM makeup_credits WHERE id = ? AND user_id = ? FOR UPDATE",
          [makeupCreditId, userId],
        );
        const credit = (credits as any[])[0];
        if (!credit || credit.status !== "granted") {
          await conn.rollback();
          return res.status(400).json({ error: ERR.MAKEUP_CREDIT_NOT_AVAILABLE });
        }
        makeupIdToUse = credit.id;
      }

      const [result] = await conn.query(
        `INSERT INTO reservations
          (user_id, event_id, reservation_type, makeup_credit_id, status, created_at)
         VALUES (?, ?, ?, ?, 'booked', NOW())`,
        [userId, eventId, reservationType, makeupIdToUse],
      );

      if (reservationType === "makeup" && makeupIdToUse) {
        await conn.query(
          "UPDATE makeup_credits SET status = 'consumed', updated_at = NOW() WHERE id = ?",
          [makeupIdToUse],
        );
      }

      await conn.commit();
      res.status(201).json({
        id: (result as any).insertId,
        userId,
        eventId,
        reservationType,
        makeupCreditId: makeupIdToUse,
        overrideCapacity: !!overrideCapacity,
      });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// --- 予約キャンセル（admin） ---
app.patch(
  "/admin/reservations/:id/cancel",
  async (req: Request, res: Response, next: NextFunction) => {
    const reservationId = Number(req.params.id);
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [rows] = await conn.query(
        "SELECT id, reservation_type, makeup_credit_id, status FROM reservations WHERE id = ? FOR UPDATE",
        [reservationId],
      );
      const reservation = (rows as any[])[0];
      if (!reservation) {
        await conn.rollback();
        return res.status(404).json({ error: ERR.RESERVATION_NOT_FOUND });
      }
      if (reservation.status !== "booked") {
        await conn.rollback();
        return res.status(400).json({ error: ERR.RESERVATION_CANCEL_NOT_BOOKED });
      }

      await conn.query(
        "UPDATE reservations SET status = 'canceled_by_admin', canceled_at = NOW() WHERE id = ?",
        [reservationId],
      );

      // 振替予約だった場合は権利を戻す
      if (reservation.reservation_type === "makeup" && reservation.makeup_credit_id) {
        await conn.query(
          "UPDATE makeup_credits SET status = 'granted', updated_at = NOW() WHERE id = ?",
          [reservation.makeup_credit_id],
        );
      }

      await conn.commit();
      res.json({ id: reservationId, status: "canceled_by_admin" });
    } catch (err) {
      await conn.rollback();
      next(err);
    } finally {
      conn.release();
    }
  },
);

// --- 予約一覧（admin） ---
app.get(
  "/admin/reservations",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId, userId } = req.query;
      const conditions: string[] = [];
      const params: any[] = [];
      if (eventId) {
        conditions.push("r.event_id = ?");
        params.push(Number(eventId));
      }
      if (userId) {
        conditions.push("r.user_id = ?");
        params.push(Number(userId));
      }
      const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
      const [rows] = await pool.query(
        `
        SELECT
          r.id,
          r.user_id,
          u.name AS user_name,
          r.event_id,
          e.starts_at,
          ct.name AS class_type_name,
          r.reservation_type,
          r.makeup_credit_id,
          r.status,
          r.created_at,
          r.canceled_at
        FROM reservations r
        LEFT JOIN users u ON u.id = r.user_id
        LEFT JOIN events e ON e.id = r.event_id
        LEFT JOIN class_types ct ON ct.id = e.class_type_id
        ${where}
        ORDER BY r.created_at DESC
      `,
        params,
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  },
);

// 未マッチ時は JSON 404（HTML が返る場合は別プロセスが 4000 で動いている可能性）
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found", path: _req.method + " " + _req.path });
});

// エラーハンドラ
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const e = err as { message?: string; sqlMessage?: string; code?: string; stack?: string };
    const msg = e?.sqlMessage ?? (err instanceof Error ? err.message : String(err));
    const code = e?.code ? ` [${e.code}]` : "";
    const stack = err instanceof Error ? (err as Error).stack : undefined;
    logger.error(stack ? `Unhandled error${code}: ${msg}\n${stack}` : `Unhandled error${code}: ${msg}`);
    res.status(500).json({ error: "Internal Server Error" });
  },
);

app.listen(port, () => {
  logger.info(`Backend API listening on port ${port}`);
});

