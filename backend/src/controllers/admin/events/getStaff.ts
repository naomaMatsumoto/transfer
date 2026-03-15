import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function getEventStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const eventId = Number(req.params.id);
  const storePh = ph(storeIds);
  const [eventRow] = await pool.query(
    `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [eventId, ...storeIds]
  );
  const events = eventRow as { id: number }[];
  if (events.length === 0) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  const [rows] = await pool.query(
    `SELECT s.id, s.name
     FROM event_staff es
     JOIN staff s ON s.id = es.staff_id
     WHERE es.event_id = ?
     ORDER BY s.name ASC`,
    [eventId]
  );
  ok(res, rows);
}
