import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, notFound, ok } from "../../../lib/respond";

export default async function getStoreSettings(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }

  const [rows] = await pool.query(
    "SELECT id, name, booking_deadline_days, cancel_deadline_hours FROM stores WHERE id = ? LIMIT 1",
    [storeIds[0]]
  );
  const store = (rows as Record<string, unknown>[])[0];
  if (!store) {
    notFound(res, "STORE_NOT_FOUND");
    return;
  }
  ok(res, store);
}
