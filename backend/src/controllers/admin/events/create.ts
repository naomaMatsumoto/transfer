import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function createEvent(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { classTypeId?: number; startsAt?: string; endsAt?: string; capacity?: number };
  const { classTypeId, startsAt, endsAt, capacity } = body;
  if (!classTypeId || !startsAt || !endsAt) {
    res.status(400).json({ error: ERR.EVENT_CREATE_PARAMS_REQUIRED });
    return;
  }
  const sql = "INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES (?, ?, ?, ?, 'scheduled')";
  const [result] = await pool.query(sql, [classTypeId, startsAt, endsAt, capacity ?? 6]);
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId });
}
