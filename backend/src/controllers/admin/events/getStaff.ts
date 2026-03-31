import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { notFound, ok } from "../../../lib/respond";
import { parseIntParam } from "../../../lib/validate";
import { findEventInStore } from "../../../lib/eventAccess";

export default async function getEventStaff(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const eventId = parseIntParam(req, "id");
  if (!eventId) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  const ownedId = await findEventInStore(eventId, storeIds);
  if (!ownedId) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  const [rows] = await pool.query(
    `SELECT s.id, s.name
     FROM event_staff es
     JOIN staff s ON s.id = es.staff_id
     WHERE es.event_id = ?
     ORDER BY s.name ASC`,
    [eventId],
  );
  ok(res, rows);
}
