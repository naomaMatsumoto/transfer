import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function listClassTypes(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const placeholders = ph(storeIds);
  const [rows] = await pool.query(
    `SELECT id, code, name, description, store_id FROM class_types WHERE store_id IN (${placeholders}) ORDER BY id ASC`,
    storeIds
  );
  ok(res, rows);
}
