import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function bulkStatusEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const body = req.body as { ids?: number[]; status?: "scheduled" | "canceled_by_admin" | "holiday" };
  const { ids, status } = body;
  if (!ids || ids.length === 0 || !status) {
    badRequest(res, ERR.EVENT_BULK_STATUS_PARAMS_REQUIRED);
    return;
  }
  if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
    badRequest(res, ERR.EVENT_STATUS_INVALID);
    return;
  }
  const storePh = ph(storeIds);
  const idsPh = ph(ids);
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.status = ?, e.updated_at = NOW() WHERE e.id IN (${idsPh}) AND ct.store_id IN (${storePh})`,
    [status, ...ids, ...storeIds]
  );
  ok(res, { updated: (result as { affectedRows: number }).affectedRows, status });
}
