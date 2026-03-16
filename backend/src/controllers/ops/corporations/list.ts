import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";

const PAGE_SIZE_MAX = 200;

export default async function listCorporations(req: Request, res: Response, _next: NextFunction): Promise<void> {
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

  // メインリスト：相関サブクエリ → LEFT JOIN GROUP BY に変更
  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.organization_type, c.name, c.status, c.created_at, c.deleted_at,
       COUNT(DISTINCT s.id) AS store_count,
       COUNT(DISTINCT a.id) AS account_count,
       COUNT(DISTINCT u.id) AS member_count
     FROM corporations c
     LEFT JOIN stores s   ON s.corporation_id = c.id
     LEFT JOIN accounts a ON a.corporation_id = c.id
     LEFT JOIN users u    ON u.store_id = s.id
     ${where}
     GROUP BY c.id
     ORDER BY c.deleted_at IS NOT NULL, c.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );

  // total と summary を並列で取得
  const [[countRows], [summaryRows]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM corporations c ${where}`, params),
    pool.query(`
      SELECT
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS total_active,
        COUNT(CASE WHEN deleted_at IS NULL AND status = 'pending' THEN 1 END) AS pending,
        COUNT(CASE WHEN deleted_at IS NULL AND status = 'email_sent' THEN 1 END) AS email_sent,
        COUNT(CASE WHEN deleted_at IS NULL AND status = 'active' THEN 1 END) AS active,
        (SELECT COUNT(*) FROM stores)   AS total_stores,
        (SELECT COUNT(*) FROM accounts) AS total_accounts
      FROM corporations
    `),
  ]);
  const total = (countRows as { total: number }[])[0].total;
  const summary = (summaryRows as Record<string, unknown>[])[0];

  ok(res, { rows, total, summary });
}
