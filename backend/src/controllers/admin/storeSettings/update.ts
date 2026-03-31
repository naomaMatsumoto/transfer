import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";
import { badRequest, ok } from "../../../lib/respond";

export default async function updateStoreSettings(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;

  const { booking_deadline_days, cancel_deadline_hours } = req.body as {
    booking_deadline_days?: number | null;
    cancel_deadline_hours?: number | null;
  };

  const updates: string[] = [];
  const params: (number | null)[] = [];
  if (booking_deadline_days !== undefined) {
    updates.push("booking_deadline_days = ?");
    params.push(booking_deadline_days);
  }
  if (cancel_deadline_hours !== undefined) {
    updates.push("cancel_deadline_hours = ?");
    params.push(cancel_deadline_hours);
  }
  if (updates.length === 0) {
    badRequest(res, "NO_UPDATES");
    return;
  }

  params.push(storeIds[0] as unknown as number);
  await pool.query(`UPDATE stores SET ${updates.join(", ")} WHERE id = ?`, params);
  await writeAuditLog({
    actorType: "admin",
    actorId: adminActorId(req),
    action: "store_settings.update",
    targetType: "store",
    targetId: storeIds[0],
    detail: { booking_deadline_days, cancel_deadline_hours },
  });
  ok(res, { ok: true });
}
