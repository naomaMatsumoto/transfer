import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function updateEventCapacity(
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
  const body = req.body as { capacity?: number };
  const { capacity } = body;
  if (capacity == null || capacity < 0) {
    badRequest(res, ERR.EVENT_CAPACITY_INVALID);
    return;
  }
  const storePh = ph(storeIds);
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [capacity, eventId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  ok(res, { id: eventId, capacity });
}
