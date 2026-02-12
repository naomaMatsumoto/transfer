import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function bulkStatusEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const body = req.body as { ids?: number[]; status?: "scheduled" | "canceled_by_admin" | "holiday" };
  const { ids, status } = body;
  if (!ids || ids.length === 0 || !status) {
    res.status(400).json({ error: ERR.EVENT_BULK_STATUS_PARAMS_REQUIRED });
    return;
  }
  if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
    res.status(400).json({ error: ERR.EVENT_STATUS_INVALID });
    return;
  }
  const storePh = storeIds.map(() => "?").join(",");
  const ph = ids.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.status = ?, e.updated_at = NOW() WHERE e.id IN (${ph}) AND ct.store_id IN (${storePh})`,
    [status, ...ids, ...storeIds]
  );
  res.json({ updated: (result as { affectedRows: number }).affectedRows, status });
}
