import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function updateEventStatus(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const eventId = Number(req.params.id);
  const body = req.body as { status?: "scheduled" | "canceled_by_admin" | "holiday" };
  const { status } = body;
  if (!status || !["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
    badRequest(res, ERR.EVENT_STATUS_INVALID);
    return;
  }
  const storePh = ph(storeIds);
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.status = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [status, eventId, ...storeIds],
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.update_status",
    targetType: "event",
    targetId: eventId,
    detail: { status },
  });
  ok(res, { id: eventId, status });
}
