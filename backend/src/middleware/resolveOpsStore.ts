import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../db";

/**
 * :storeId が req.corporation に属する店舗か検証し、req.storeId に数値 ID をセットする。
 * resolveCorporation の後に使用すること。
 */
export async function resolveOpsStore(req: Request, res: Response, next: NextFunction): Promise<void> {
  const corp = req.corporation;
  if (!corp) {
    res.status(404).json({ error: "CORPORATION_NOT_FOUND" });
    return;
  }
  const raw = req.params.storeId;
  const storeId = Number(raw);
  if (!Number.isInteger(storeId) || storeId <= 0) {
    res.status(400).json({ error: "INVALID_STORE_ID" });
    return;
  }
  try {
    const [rows] = await pool.query("SELECT id FROM stores WHERE id = ? AND corporation_id = ?", [storeId, corp.id]);
    const row = (rows as { id: number }[])[0];
    if (!row) {
      res.status(404).json({ error: "STORE_NOT_FOUND" });
      return;
    }
    req.storeId = row.id;
    next();
  } catch (err) {
    next(err);
  }
}

/** Ops の store スコープ用: req.storeId から storeIds 配列を返す。未設定なら空配列。 */
export function getOpsStoreIds(req: Request): number[] {
  const id = req.storeId;
  return id != null ? [id] : [];
}
