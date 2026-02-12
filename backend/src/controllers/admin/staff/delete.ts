import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function deleteStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const id = Number(req.params.id);
  const placeholders = storeIds.map(() => "?").join(",");
  const [result] = await pool.query(
    `DELETE FROM staff WHERE id = ? AND store_id IN (${placeholders})`,
    [id, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.STAFF_NOT_FOUND });
    return;
  }
  res.json({ id, deleted: true });
}
