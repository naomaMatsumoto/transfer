import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get("/", asyncHandler(async (req: Request, res: Response) => {
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
}));

router.post("/", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

router.post("/bulk", asyncHandler(async (req: Request, res: Response) => {
  const { classTypeId, startTime, endTime, capacity, weekdays, dateFrom, dateTo, excludeDates } =
    req.body as {
      classTypeId?: number;
      startTime?: string;
      endTime?: string;
      capacity?: number;
      weekdays?: number[];
      dateFrom?: string;
      dateTo?: string;
      excludeDates?: string[];
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
      const day = cursor.getDay();
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, "0");
      const d = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;

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

    res.status(201).json({ count: created.length, events: created });
  } catch (err) {
    throw err;
  }
}));

router.post("/bulk-delete", asyncHandler(async (req: Request, res: Response) => {
  const { ids } = req.body as { ids?: number[] };
  if (!ids || ids.length === 0) {
    return res.status(400).json({ error: ERR.EVENT_IDS_REQUIRED });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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

    await conn.query(
      `DELETE FROM reservations WHERE event_id IN (${placeholders})`,
      ids,
    );
    await conn.query(
      `UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (${placeholders})`,
      ids,
    );
    const [result] = await conn.query(
      `DELETE FROM events WHERE id IN (${placeholders})`,
      ids,
    );

    await conn.commit();
    res.json({ deleted: (result as any).affectedRows });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

router.post("/bulk-status", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

router.post("/bulk-capacity", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

router.post("/bulk-time", asyncHandler(async (req: Request, res: Response) => {
  const { ids, startTime, endTime } = req.body as {
    ids?: number[];
    startTime?: string;
    endTime?: string;
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
    throw err;
  }
}));

router.delete("/:id", asyncHandler(async (req: Request, res: Response) => {
  const eventId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

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

    await conn.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
    await conn.query(
      "UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id = ?",
      [eventId],
    );

    const [result] = await conn.query("DELETE FROM events WHERE id = ?", [eventId]);
    if ((result as any).affectedRows === 0) {
      await conn.rollback();
      return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    }

    await conn.commit();
    res.json({ id: eventId, deleted: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}));

router.patch("/:id/status", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

router.patch("/:id/time", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

router.patch("/:id/capacity", asyncHandler(async (req: Request, res: Response) => {
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
    throw err;
  }
}));

export default router;
