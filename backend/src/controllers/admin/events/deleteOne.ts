import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function deleteOneEvent(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const eventId = Number(req.params.id);
  const storePlaceholders = storeIds.map(() => "?").join(",");
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [eventScope] = await conn.query(
      `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePlaceholders})`,
      [eventId, ...storeIds]
    );
    if ((eventScope as unknown[]).length === 0) {
      await conn.rollback();
      res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
      return;
    }
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
