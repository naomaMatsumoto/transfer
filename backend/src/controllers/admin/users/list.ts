import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function listUsers(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const placeholders = ph(storeIds);
  const [rows] = await pool.query(
    `SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users WHERE store_id IN (${placeholders}) ORDER BY id ASC`,
    storeIds
  );
  ok(res, rows);
}
