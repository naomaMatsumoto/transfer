import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function updateStaff(
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
  const body = req.body as { name?: string };
  const name = body.name;
  if (name === undefined) {
    res.status(400).json({ error: ERR.STAFF_UPDATE_EMPTY });
    return;
  }
  const trimmed = String(name).trim();
  if (trimmed.length === 0) {
    res.status(400).json({ error: ERR.STAFF_NAME_EMPTY });
    return;
  }
  const placeholders = storeIds.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE staff SET name = ? WHERE id = ? AND store_id IN (${placeholders})`,
    [trimmed, id, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.STAFF_NOT_FOUND });
    return;
  }
  res.json({ id, name: trimmed, updated: true });
}
