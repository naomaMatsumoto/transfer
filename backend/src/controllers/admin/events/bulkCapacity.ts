import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function bulkCapacityEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const body = req.body as { ids?: number[]; capacity?: number };
  const { ids, capacity } = body;
  if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
    res.status(400).json({ error: ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED });
    return;
  }
  const storePh = storeIds.map(() => "?").join(",");
  const placeholders = ids.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id IN (${placeholders}) AND ct.store_id IN (${storePh})`,
    [capacity, ...ids, ...storeIds]
  );
  res.json({
    updated: (result as { affectedRows: number }).affectedRows,
    capacity,
  });
}
