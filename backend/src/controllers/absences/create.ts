import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import type { InsertResult, RowDataPacket } from "../../types/db";
import { badRequest, notFound, created } from "../../lib/respond";

export default async function createAbsence(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { userId, eventId, reason } = req.body as {
    userId?: number;
    eventId?: number;
    reason?: string;
  };
  if (!userId || !eventId) {
    badRequest(res, ERR.USER_ID_EVENT_ID_REQUIRED);
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [events] = await conn.query(
      "SELECT id, class_type_id FROM events WHERE id = ? FOR UPDATE",
      [eventId],
    );
    const eventRow = (events as RowDataPacket[])[0];
    if (!eventRow) {
      await conn.rollback();
      notFound(res, ERR.EVENT_NOT_FOUND);
      return;
    }
    const [result] = await conn.query(
      "INSERT INTO makeup_credits (user_id, class_type_id, granted_at, status, source, source_event_id, note) VALUES (?, ?, NOW(), 'granted', 'absence', ?, ?)",
      [userId, eventRow.class_type_id, eventId, reason ?? null],
    );
    await conn.commit();
    created(res, {
      id: (result as InsertResult).insertId,
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
