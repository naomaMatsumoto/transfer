import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function bulkCapacityEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const body = req.body as { ids?: number[]; capacity?: number };
  const { ids, capacity } = body;
  if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
    badRequest(res, ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const placeholders = ph(ids);
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.capacity = ?, e.updated_at = NOW() WHERE e.id IN (${placeholders}) AND ct.store_id IN (${storePh})`,
    [capacity, ...ids, ...storeIds]
  );
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.bulk_capacity",
    targetType: "event",
    targetId: null,
    detail: { ids: ids, capacity },
  });
  ok(res, {
    updated: (result as { affectedRows: number }).affectedRows,
    capacity,
  });
}
