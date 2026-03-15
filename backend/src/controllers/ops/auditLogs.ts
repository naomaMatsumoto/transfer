import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ok } from "../../lib/respond";

export default async function listAuditLogs(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 100, 500);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const action = req.query.action ? String(req.query.action) : undefined;

  let where = "";
  const params: unknown[] = [];
  if (action) {
    where = "WHERE action = ?";
    params.push(action);
  }

  const [rows] = await pool.query(
    `SELECT id, actor_type, actor_id, action, target_type, target_id, detail, created_at
     FROM audit_logs ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
    params
  );
  const countRow = (countRows as { total: number }[])[0];

  ok(res, { rows, total: countRow.total });
}
