import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function bulkCapacityEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { ids?: number[]; capacity?: number };
  const { ids, capacity } = body;
  if (!ids || ids.length === 0 || capacity == null || capacity < 0) {
    res.status(400).json({ error: ERR.EVENT_BULK_CAPACITY_PARAMS_REQUIRED });
    return;
  }
  const placeholders = ids.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE events SET capacity = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
    [capacity, ...ids]
  );
  res.json({
    updated: (result as { affectedRows: number }).affectedRows,
    capacity,
  });
}
