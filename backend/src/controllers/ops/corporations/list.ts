import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function listCorporations(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query(
    `SELECT c.id, c.organization_type, c.name, c.created_at,
       (SELECT COUNT(*) FROM stores s WHERE s.corporation_id = c.id) AS store_count,
       (SELECT COUNT(*) FROM accounts a WHERE a.corporation_id = c.id) AS account_count
     FROM corporations c
     ORDER BY c.id ASC`
  );
  res.json(rows);
}
