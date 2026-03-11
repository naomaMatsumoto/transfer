import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function getStoreSettings(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT id, name, booking_deadline_days, cancel_deadline_hours FROM stores WHERE id = ? LIMIT 1",
    [storeIds[0]]
  );
  const store = (rows as Record<string, unknown>[])[0];
  if (!store) {
    res.status(404).json({ error: "STORE_NOT_FOUND" });
    return;
  }
  res.json(store);
}
