import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function createStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const storeId = storeIds[0];
  const body = req.body as { name?: string };
  const name = body.name;
  if (name === undefined || name === null) {
    res.status(400).json({ error: ERR.STAFF_NAME_REQUIRED });
    return;
  }
  const trimmed = String(name).trim();
  if (trimmed.length === 0) {
    res.status(400).json({ error: ERR.STAFF_NAME_EMPTY });
    return;
  }
  const [result] = await pool.query(
    "INSERT INTO staff (store_id, name) VALUES (?, ?)",
    [storeId, trimmed]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, name: trimmed });
}
