import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { writeAuditLog } from "../../lib/auditLog";
import { badRequest, notFound, ok } from "../../lib/respond";
import { getMemberId } from "../../lib/session";
import { parseIntParam } from "../../lib/validate";

export default async function leaveWaitlist(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const memberId = getMemberId(req, res);
  if (!memberId) return;

  const eventId = parseIntParam(req, "eventId");
  if (!eventId) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const [result] = await pool.query("DELETE FROM waitlist WHERE user_id = ? AND event_id = ?", [memberId, eventId]);
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, "NOT_ON_WAITLIST");
    return;
  }

  void writeAuditLog({
    actorType: "member",
    actorId: memberId,
    action: "waitlist.leave",
    targetType: "event",
    targetId: eventId,
  });
  ok(res, { ok: true });
}
