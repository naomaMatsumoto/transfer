import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";

const PAGE_SIZE_MAX = 200;

export default async function listCorporations(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const limit = Math.min(Number(req.query.limit) || 50, PAGE_SIZE_MAX);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const includeDeleted = req.query.include_deleted === "1";
  const search = String(req.query.search ?? "").trim();
  const statusFilter = String(req.query.status ?? "");

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (statusFilter === "deleted") {
    conditions.push("c.deleted_at IS NOT NULL");
  } else if (!includeDeleted) {
    conditions.push("c.deleted_at IS NULL");
  }

  if (statusFilter && statusFilter !== "all" && statusFilter !== "deleted") {
    conditions.push("c.status = ?");
    params.push(statusFilter);
  }

  if (search) {
    conditions.push("c.name LIKE ?");
    params.push(`%${search}%`);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.organization_type, c.name, c.status, c.created_at, c.deleted_at,
       (SELECT COUNT(*) FROM stores s WHERE s.corporation_id = c.id) AS store_count,
       (SELECT COUNT(*) FROM accounts a WHERE a.corporation_id = c.id) AS account_count,
       (SELECT COUNT(*) FROM users u
          JOIN stores s2 ON u.store_id = s2.id
          WHERE s2.corporation_id = c.id) AS member_count
     FROM corporations c
     ${where}
     ORDER BY c.deleted_at IS NOT NULL, c.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM corporations c ${where}`,
    params,
  );
  const total = (countRows as { total: number }[])[0].total;

  const [summaryRows] = await pool.query(`
    SELECT
      COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS total_active,
      COUNT(CASE WHEN deleted_at IS NULL AND status = 'pending' THEN 1 END) AS pending,
      COUNT(CASE WHEN deleted_at IS NULL AND status = 'email_sent' THEN 1 END) AS email_sent,
      COUNT(CASE WHEN deleted_at IS NULL AND status = 'active' THEN 1 END) AS active,
      (SELECT COUNT(*) FROM stores) AS total_stores,
      (SELECT COUNT(*) FROM accounts) AS total_accounts
    FROM corporations
  `);
  const summary = (summaryRows as Record<string, unknown>[])[0];

  ok(res, { rows, total, summary });
}
