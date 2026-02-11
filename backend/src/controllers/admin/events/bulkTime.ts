import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function bulkTimeEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as {
    ids?: number[];
    startTime?: string;
    endTime?: string;
  };
  const { ids, startTime, endTime } = body;
  if (!ids || ids.length === 0 || !startTime || !endTime) {
    res.status(400).json({ error: ERR.EVENT_BULK_TIME_PARAMS_REQUIRED });
    return;
  }
  let updated = 0;
  for (const id of ids) {
    const [rows] = await pool.query("SELECT starts_at, ends_at FROM events WHERE id = ?", [id]);
    const row = (rows as { starts_at: string; ends_at: string }[])[0];
    if (!row) continue;
    const dateStr = new Date(row.starts_at).toISOString().slice(0, 10);
    const newStart = `${dateStr} ${startTime}:00`;
    const newEnd = `${dateStr} ${endTime}:00`;
    await pool.query(
      "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
      [newStart, newEnd, id]
    );
    updated++;
  }
  res.json({ updated, startTime, endTime });
}
