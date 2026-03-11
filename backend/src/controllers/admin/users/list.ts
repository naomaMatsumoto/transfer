import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function listUsers(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const placeholders = storeIds.map(() => "?").join(",");
  const [rows] = await pool.query(
    `SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users WHERE store_id IN (${placeholders}) ORDER BY id ASC`,
    storeIds
  );
  res.json(rows);
}
