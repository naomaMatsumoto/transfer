import { Request, Response, NextFunction } from "express";
import { pool } from "../../db";

/**
 * 会員登録フォーム用。店舗一覧を返す（公開API）
 */
export default async function listStoresPublic(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query(
    "SELECT id, name FROM stores ORDER BY corporation_id, id ASC"
  );
  res.json(rows);
}
