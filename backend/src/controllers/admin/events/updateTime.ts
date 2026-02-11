import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function updateEventTime(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const eventId = Number(req.params.id);
  const body = req.body as { startsAt?: string; endsAt?: string };
  const { startsAt, endsAt } = body;
  if (!startsAt || !endsAt) {
    res.status(400).json({ error: ERR.EVENT_TIME_PARAMS_REQUIRED });
    return;
  }
  const [result] = await pool.query(
    "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
    [startsAt, endsAt, eventId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    return;
  }
  res.json({ id: eventId, startsAt, endsAt });
}
