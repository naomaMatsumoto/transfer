import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function deleteUser(
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
  const [refCredits] = await pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
  const [refRes] = await pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
  if ((refCredits as any[]).length > 0 || (refRes as any[]).length > 0) {
    res.status(400).json({ error: ERR.MEMBER_DELETE_HAS_REFERENCES });
    return;
  }
  const [result] = await pool.query(
    `DELETE FROM users WHERE id = ? AND store_id IN (${placeholders})`,
    [id, ...storeIds]
  );
  if ((result as any).affectedRows === 0) {
    res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
    return;
  }
  res.json({ id, deleted: true });
}
