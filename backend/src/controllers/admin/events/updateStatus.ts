import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function updateEventStatus(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const eventId = Number(req.params.id);
  const body = req.body as { status?: "scheduled" | "canceled_by_admin" | "holiday" };
  const { status } = body;
  if (!status || !["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
    res.status(400).json({ error: ERR.EVENT_STATUS_INVALID });
    return;
  }
  const [result] = await pool.query(
    "UPDATE events SET status = ?, updated_at = NOW() WHERE id = ?",
    [status, eventId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    return;
  }
  res.json({ id: eventId, status });
}
