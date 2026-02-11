import { Request, Response, NextFunction } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";

export default async function listMakeupCredits(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { userId } = req.query;
  const userIdNum = Number(userId);
  if (!userIdNum) {
    res.status(400).json({ error: ERR.USER_ID_REQUIRED });
    return;
  }
  const [rows] = await pool.query(
    "SELECT id, user_id, class_type_id, granted_at, expires_at, status, source, source_event_id, note FROM makeup_credits WHERE user_id = ? AND status = 'granted' ORDER BY granted_at ASC",
    [userIdNum],
  );
  res.json(rows);
}
