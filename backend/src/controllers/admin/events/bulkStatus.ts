import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function bulkStatusEvents(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
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
    [status, ...ids, ...storeIds],
  );
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.bulk_status",
    targetType: "event",
    targetId: null,
    detail: { ids, status },
  });
  ok(res, { updated: (result as { affectedRows: number }).affectedRows, status });
}
