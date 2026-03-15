import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function updateEventTime(
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
  const body = req.body as { startsAt?: string; endsAt?: string };
  const { startsAt, endsAt } = body;
  if (!startsAt || !endsAt) {
    badRequest(res, ERR.EVENT_TIME_PARAMS_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.starts_at = ?, e.ends_at = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [startsAt, endsAt, eventId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.EVENT_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.update_time",
    targetType: "event",
    targetId: eventId,
    detail: { startsAt, endsAt },
  });
  ok(res, { id: eventId, startsAt, endsAt });
}
