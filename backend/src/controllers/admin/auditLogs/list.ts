import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";

export default async function listAuditLogs(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const offset = Number(req.query.offset) || 0;

  const [rows] = await pool.query(
    `SELECT id, actor_type, actor_id, action, target_type, target_id, detail, created_at
     FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );

  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM audit_logs");
  const total = (countRows as { total: number }[])[0]?.total ?? 0;

  ok(res, { logs: rows, total, limit, offset });
}
