import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function deleteOneEvent(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const eventId = Number(req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [reservations] = await conn.query(
      "SELECT id FROM reservations WHERE event_id = ? AND status IN ('booked','attended')",
      [eventId]
    );
    if ((reservations as unknown[]).length > 0) {
      await conn.rollback();
      res.status(400).json({
        error: ERR.EVENT_DELETE_HAS_RESERVATIONS,
        count: (reservations as unknown[]).length,
      });
      return;
    }
    await conn.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
    await conn.query(
      "UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id = ?",
      [eventId]
    );
    const [result] = await conn.query("DELETE FROM events WHERE id = ?", [eventId]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await conn.rollback();
      res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      return;
    }
    await conn.commit();
    res.json({ id: eventId, deleted: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
