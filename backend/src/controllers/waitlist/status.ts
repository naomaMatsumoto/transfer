import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";

export default async function waitlistStatus(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const eventId = Number(req.params.eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT COUNT(*) AS count FROM waitlist WHERE event_id = ?",
    [eventId]
  );
  const count = (rows as { count: number }[])[0]?.count ?? 0;

  const memberId = req.session?.memberId;
  let onWaitlist = false;
  if (memberId != null && typeof memberId === "number") {
    const [wRows] = await pool.query(
      "SELECT 1 FROM waitlist WHERE user_id = ? AND event_id = ? LIMIT 1",
      [memberId, eventId]
    );
    onWaitlist = (wRows as unknown[]).length > 0;
  }

  res.json({ eventId, waitlistCount: count, onWaitlist });
}
