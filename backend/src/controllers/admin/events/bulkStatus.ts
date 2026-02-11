import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function bulkStatusEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { ids?: number[]; status?: "scheduled" | "canceled_by_admin" | "holiday" };
  const { ids, status } = body;
  if (!ids || ids.length === 0 || !status) {
    res.status(400).json({ error: ERR.EVENT_BULK_STATUS_PARAMS_REQUIRED });
    return;
  }
  if (!["scheduled", "canceled_by_admin", "holiday"].includes(status)) {
    res.status(400).json({ error: ERR.EVENT_STATUS_INVALID });
    return;
  }
  const ph = ids.map(() => "?").join(",");
  const [result] = await pool.query(
    "UPDATE events SET status = ?, updated_at = NOW() WHERE id IN (" + ph + ")",
    [status, ...ids]
  );
  res.json({ updated: (result as { affectedRows: number }).affectedRows, status });
}
