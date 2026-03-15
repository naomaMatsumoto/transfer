import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ok } from "../../lib/respond";

export default async function listStoresPublic(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query(
    `SELECT s.id, s.name FROM stores s
     JOIN corporations c ON c.id = s.corporation_id
     WHERE c.status = 'active' AND c.deleted_at IS NULL
     ORDER BY s.corporation_id, s.id ASC`
  );
  ok(res, rows);
}
