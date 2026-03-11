import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { writeAuditLog } from "../../lib/auditLog";

export default async function joinWaitlist(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }

  const { eventId } = req.body as { eventId?: number };
  if (!eventId) {
    res.status(400).json({ error: "EVENT_ID_REQUIRED" });
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
    res.status(404).json({ error: "EVENT_NOT_FOUND" });
    return;
  }
  if (event.reserved_count < event.capacity) {
    res.status(400).json({ error: "EVENT_NOT_FULL", message: "空きがあります。直接予約できます。" });
    return;
  }

  try {
    await pool.query(
      "INSERT INTO waitlist (user_id, event_id) VALUES (?, ?)",
      [memberId, eventId]
    );
  } catch (e: unknown) {
    if (e instanceof Error && "code" in e && (e as { code: string }).code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "ALREADY_ON_WAITLIST" });
      return;
    }
    throw e;
  }

  void writeAuditLog({ actorType: "member", actorId: memberId, action: "waitlist.join", targetType: "event", targetId: eventId });
  res.status(201).json({ ok: true });
}
