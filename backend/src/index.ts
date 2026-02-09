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

const pool = createPool({
  host: process.env.DB_HOST || "db",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "app",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "makeup_app",
  waitForConnections: true,
  connectionLimit: 10,
});

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
        return res
          .status(400)
          .json({ error: "`from` と `to` は必須です (YYYY-MM-DD)" });
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
        return res.status(400).json({ error: "`userId` は必須です" });
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
      return res
        .status(400)
        .json({ error: "`userId` と `eventId` は必須です" });
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
        return res.status(404).json({ error: "イベントが存在しません" });
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
      return res.status(400).json({
        error: "`userId`, `eventId`, `reservationType` は必須です",
      });
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
        return res.status(404).json({ error: "イベントが存在しません" });
      }
      if (event.status !== "scheduled") {
        await conn.rollback();
        return res.status(400).json({ error: "この枠は予約できません" });
      }
      if (event.reserved_count >= event.capacity) {
        await conn.rollback();
        return res.status(400).json({ error: "定員に達しています" });
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
        return res.status(400).json({ error: "すでにこの枠を予約済みです" });
      }

      let makeupIdToUse: number | null = null;

      if (reservationType === "makeup") {
        if (!makeupCreditId) {
          await conn.rollback();
          return res
            .status(400)
            .json({ error: "`makeupCreditId` が必要です" });
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
          return res
            .status(400)
            .json({ error: "利用可能な振替権利が見つかりません" });
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

// --- ユーザー一覧（プルダウン用） ---
app.get(
  "/admin/users",
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [rows] = await pool.query(
        "SELECT id, name, email, grade, course_type, status FROM users ORDER BY id ASC",
      );
      res.json(rows);
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

// --- クラス種別 作成 ---
app.post(
  "/admin/class-types",
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, name, description } = req.body as {
      code?: string;
      name?: string;
      description?: string;
    };
    if (!code || !name) {
      return res.status(400).json({ error: "code と name は必須です" });
    }
    try {
      const [result] = await pool.query(
        "INSERT INTO class_types (code, name, description) VALUES (?, ?, ?)",
        [code, name, description ?? null],
      );
      res.status(201).json({ id: (result as any).insertId, code, name });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "この code は既に使われています" });
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
    if (code !== undefined) { sets.push("code = ?"); params.push(code); }
    if (name !== undefined) { sets.push("name = ?"); params.push(name); }
    if (description !== undefined) { sets.push("description = ?"); params.push(description); }
    if (sets.length === 0) {
      return res.status(400).json({ error: "更新する項目がありません" });
    }
    params.push(id);
    try {
      const [result] = await pool.query(
        `UPDATE class_types SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: "クラス種別が見つかりません" });
      }
      res.json({ id, updated: true });
    } catch (err: any) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(400).json({ error: "この code は既に使われています" });
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
        return res.status(404).json({ error: "クラス種別が見つかりません" });
      }
      res.json({ id, deleted: true });
    } catch (err: any) {
      if (err.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(400).json({ error: "このクラス種別はイベント等で使用中のため削除できません" });
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
      return res.status(400).json({ error: "classTypeId, startsAt, endsAt は必須です" });
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
      return res.status(400).json({
        error: "classTypeId, startTime, endTime, weekdays, dateFrom, dateTo は必須です",
      });
    }

    const excludeSet = new Set(excludeDates ?? []);
    const created: { id: number; date: string }[] = [];

    try {
      const cursor = new Date(dateFrom + "T00:00:00");
      const end = new Date(dateTo + "T00:00:00");

      while (cursor <= end) {
        const day = cursor.getDay(); // 0=日〜6=土
        const dateStr = cursor.toISOString().slice(0, 10);

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
          error: `このイベントには有効な予約が ${(reservations as any[]).length} 件あります。先に予約をキャンセルしてください`,
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
        return res.status(404).json({ error: "イベントが見つかりません" });
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
      return res.status(400).json({ error: "ids は必須です" });
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
        const blocked = activeEvents.map((r: any) => `#${r.event_id}(${r.cnt}件)`).join(", ");
        return res.status(400).json({
          error: `有効な予約があるイベントがあります: ${blocked}。先に予約をキャンセルしてください`,
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
      return res.status(400).json({ error: "ids と status は必須です" });
    }
    if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
      return res.status(400).json({ error: "status が不正です" });
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
      return res.status(400).json({ error: "ids と capacity は必須です" });
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
      return res.status(400).json({ error: "ids, startTime, endTime は必須です" });
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
      return res
        .status(400)
        .json({ error: "status は scheduled / canceled_by_admin / holiday のいずれかです" });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?",
        [status, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: "イベントが見つかりません" });
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
      return res.status(400).json({ error: "startsAt と endsAt は必須です" });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
        [startsAt, endsAt, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: "イベントが見つかりません" });
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
      return res.status(400).json({ error: "capacity は 0 以上の数値です" });
    }
    try {
      const [result] = await pool.query(
        "UPDATE events SET capacity = ?, updated_at = NOW() WHERE id = ?",
        [capacity, eventId],
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: "イベントが見つかりません" });
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
      return res.status(400).json({ error: "userId は必須です" });
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
      return res.status(400).json({ error: "更新する項目がありません" });
    }
    sets.push("updated_at = NOW()");
    params.push(creditId);
    try {
      const [result] = await pool.query(
        `UPDATE makeup_credits SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
      if ((result as any).affectedRows === 0) {
        return res.status(404).json({ error: "振替権利が見つかりません" });
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
        return res.status(404).json({ error: "振替権利が見つかりません" });
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
      return res.status(400).json({
        error: "userId, eventId, reservationType は必須です",
      });
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
        return res.status(404).json({ error: "イベントが存在しません" });
      }

      // 特例承認でなければ定員チェック
      if (!overrideCapacity && event.reserved_count >= event.capacity) {
        await conn.rollback();
        return res.status(400).json({ error: "定員に達しています（特例承認で+1可能）" });
      }

      // 重複チェック
      const [existing] = await conn.query(
        "SELECT id FROM reservations WHERE user_id = ? AND event_id = ? AND status IN ('booked','attended') FOR UPDATE",
        [userId, eventId],
      );
      if ((existing as any[]).length > 0) {
        await conn.rollback();
        return res.status(400).json({ error: "すでにこの枠を予約済みです" });
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
          return res.status(400).json({ error: "利用可能な振替権利が見つかりません" });
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
        return res.status(404).json({ error: "予約が見つかりません" });
      }
      if (reservation.status !== "booked") {
        await conn.rollback();
        return res.status(400).json({ error: "booked 以外はキャンセルできません" });
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

// エラーハンドラ
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    logger.error("Unhandled error", { err });
    res.status(500).json({ error: "Internal Server Error" });
  },
);

app.listen(port, () => {
  logger.info(`Backend API listening on port ${port}`);
});

