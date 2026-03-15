import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { writeAuditLog } from "../../lib/auditLog";
import { unauthorized, badRequest, notFound, created } from "../../lib/respond";

export default async function joinWaitlist(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    unauthorized(res);
    return;
  }

  const { eventId } = req.body as { eventId?: number };
  if (!eventId) {
    badRequest(res, "EVENT_ID_REQUIRED");
    return;
  }

  const [evRows] = await pool.query(
    `SELECT e.id, e.capacity, e.status,
       COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count
     FROM events e LEFT JOIN reservations r ON r.event_id = e.id
     WHERE e.id = ? GROUP BY e.id`,
    [eventId]
  );
  const event = (evRows as { id: number; capacity: number; status: string; reserved_count: number }[])[0];
  if (!event) {
    notFound(res, "EVENT_NOT_FOUND");
    return;
  }
  if (event.reserved_count < event.capacity) {
    badRequest(res, "EVENT_NOT_FULL", { message: "空きがあります。直接予約できます。" });
    return;
  }

  try {
    await pool.query(
      "INSERT INTO waitlist (user_id, event_id) VALUES (?, ?)",
      [memberId, eventId]
    );
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "ER_DUP_ENTRY") {
      badRequest(res, "ALREADY_ON_WAITLIST");
      return;
    }
    throw e;
  }

  void writeAuditLog({ actorType: "member", actorId: memberId, action: "waitlist.join", targetType: "event", targetId: eventId });
  created(res, { ok: true });
}
