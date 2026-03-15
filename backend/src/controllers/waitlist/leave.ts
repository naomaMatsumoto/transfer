import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { writeAuditLog } from "../../lib/auditLog";
import { unauthorized, badRequest, notFound, ok } from "../../lib/respond";

export default async function leaveWaitlist(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    unauthorized(res);
    return;
  }

  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const [result] = await pool.query(
    "DELETE FROM waitlist WHERE user_id = ? AND event_id = ?",
    [memberId, eventId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, "NOT_ON_WAITLIST");
    return;
  }

  void writeAuditLog({ actorType: "member", actorId: memberId, action: "waitlist.leave", targetType: "event", targetId: eventId });
  ok(res, { ok: true });
}
