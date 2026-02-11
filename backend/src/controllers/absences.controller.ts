import { Request, Response, NextFunction } from "express";
import { pool } from "../db";
import { ERR } from "../constants";

export async function create(req: Request, res: Response, _next: NextFunction) {
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
    const [events] = await conn.query(
      "SELECT id, class_type_id FROM events WHERE id = ? FOR UPDATE",
      [eventId],
    );
    const eventRow = (events as any[])[0];
    if (!eventRow) {
      await conn.rollback();
      return res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    }
    const [result] = await conn.query(
      "INSERT INTO makeup_credits (user_id, class_type_id, granted_at, status, source, source_event_id, note) VALUES (?, ?, NOW(), 'granted', 'absence', ?, ?)",
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
    throw err;
  } finally {
    conn.release();
  }
}
