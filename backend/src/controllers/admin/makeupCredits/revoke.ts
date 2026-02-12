import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function revokeMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const creditId = Number(req.params.id);
  const storePh = storeIds.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE makeup_credits mc JOIN users u ON u.id = mc.user_id SET mc.status = 'revoked', mc.updated_at = NOW() WHERE mc.id = ? AND u.store_id IN (${storePh})`,
    [creditId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    return;
  }
  res.json({ id: creditId, status: "revoked" });
}
