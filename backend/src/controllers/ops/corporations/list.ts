import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";

export default async function listCorporations(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const includeDeleted = req.query.include_deleted === "1";

  const where = includeDeleted ? "" : "WHERE c.deleted_at IS NULL";

  const [rows] = await pool.query(
    `SELECT c.id, c.code, c.organization_type, c.name, c.status, c.created_at, c.deleted_at,
       (SELECT COUNT(*) FROM stores s WHERE s.corporation_id = c.id) AS store_count,
       (SELECT COUNT(*) FROM accounts a WHERE a.corporation_id = c.id) AS account_count,
       (SELECT COUNT(*) FROM users u
          JOIN stores s2 ON u.store_id = s2.id
          WHERE s2.corporation_id = c.id) AS member_count
     FROM corporations c
     ${where}
     ORDER BY c.deleted_at IS NOT NULL, c.id ASC`
  );
  ok(res, rows);
}
