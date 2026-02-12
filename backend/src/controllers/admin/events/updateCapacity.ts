import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function updateEventCapacity(
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
  const body = req.body as { capacity?: number };
  const { capacity } = body;
  if (capacity == null || capacity < 0) {
    res.status(400).json({ error: ERR.EVENT_CAPACITY_INVALID });
    return;
  }
  const storePh = storeIds.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [capacity, eventId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    return;
  }
  res.json({ id: eventId, capacity });
}
