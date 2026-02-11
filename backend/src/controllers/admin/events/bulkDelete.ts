import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function bulkDeleteEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { ids?: unknown; force?: boolean };
  const raw = body.ids;
  const ids = Array.isArray(raw)
    ? raw.map((id) => (typeof id === "string" ? parseInt(id, 10) : Number(id))).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const force = body.force === true;
  if (ids.length === 0) {
    res.status(400).json({ error: ERR.EVENT_IDS_REQUIRED });
    return;
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const ph = ids.map(() => "?").join(",");
    if (!force) {
      const q1 = "SELECT event_id, COUNT(*) AS cnt FROM reservations WHERE event_id IN (" + ph + ") AND status IN ('booked','attended') GROUP BY event_id";
      const [activeRes] = await conn.query(q1, ids);
      const activeEvents = activeRes as { event_id: number; cnt: number }[];
      if (activeEvents.length > 0) {
        await conn.rollback();
        const details = activeEvents.map((r) => ({ eventId: r.event_id, count: r.cnt }));
        res.status(400).json({ error: ERR.EVENT_BULK_DELETE_HAS_RESERVATIONS, details });
        return;
      }
    }
    await conn.query("DELETE FROM reservations WHERE event_id IN (" + ph + ")", ids);
    await conn.query("UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (" + ph + ")", ids);
    const [result] = await conn.query("DELETE FROM events WHERE id IN (" + ph + ")", ids);
    await conn.commit();
    res.json({ deleted: (result as { affectedRows: number }).affectedRows });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
