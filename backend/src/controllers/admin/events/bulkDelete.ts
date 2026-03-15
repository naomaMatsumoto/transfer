import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function bulkDeleteEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const body = req.body as { ids?: unknown; force?: boolean };
  const raw = body.ids;
  const ids = Array.isArray(raw)
    ? raw.map((id) => (typeof id === "string" ? parseInt(id, 10) : Number(id))).filter((n) => Number.isInteger(n) && n > 0)
    : [];
  const force = body.force === true;
  if (ids.length === 0) {
    badRequest(res, ERR.EVENT_IDS_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const idsPh = ph(ids);
    const [allowedRows] = await conn.query(
      `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id IN (${idsPh}) AND ct.store_id IN (${storePh})`,
      [...ids, ...storeIds]
    );
    const allowedIds = (allowedRows as { id: number }[]).map((r) => r.id);
    if (allowedIds.length === 0) {
      await conn.rollback();
      ok(res, { deleted: 0 });
      return;
    }
    const allowedPh = ph(allowedIds);
    if (!force) {
      const q1 = "SELECT event_id, COUNT(*) AS cnt FROM reservations WHERE event_id IN (" + allowedPh + ") AND status IN ('booked','attended') GROUP BY event_id";
      const [activeRes] = await conn.query(q1, allowedIds);
      const activeEvents = activeRes as { event_id: number; cnt: number }[];
      if (activeEvents.length > 0) {
        await conn.rollback();
        const details = activeEvents.map((r) => ({ eventId: r.event_id, count: r.cnt }));
        badRequest(res, ERR.EVENT_BULK_DELETE_HAS_RESERVATIONS, { details });
        return;
      }
    }
    await conn.query("DELETE FROM reservations WHERE event_id IN (" + allowedPh + ")", allowedIds);
    await conn.query("UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (" + allowedPh + ")", allowedIds);
    const [result] = await conn.query("DELETE FROM events WHERE id IN (" + allowedPh + ")", allowedIds);
    await conn.commit();
    ok(res, { deleted: (result as { affectedRows: number }).affectedRows });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
