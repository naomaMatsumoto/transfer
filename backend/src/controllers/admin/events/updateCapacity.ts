import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function updateEventCapacity(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const eventId = Number(req.params.id);
  const body = req.body as { capacity?: number };
  const { capacity } = body;
  if (capacity == null || capacity < 0) {
    res.status(400).json({ error: ERR.EVENT_CAPACITY_INVALID });
    return;
  }
  const [result] = await pool.query(
    "UPDATE events SET capacity = ?, updated_at = NOW() WHERE id = ?",
    [capacity, eventId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    return;
  }
  res.json({ id: eventId, capacity });
}
