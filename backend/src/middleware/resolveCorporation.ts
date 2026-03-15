import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../db";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      corporation?: { id: number; code: string; name: string; status: string; deleted_at: string | null };
      /** Set by resolveOpsStore: store id (numeric) when in ops store-scoped route */
      storeId?: number;
    }
  }
}

/**
 * :id パラメータから事業者を解決して req.corporation にセットする。
 * 数値 ID とアルファベットの code の両方に対応。
 * 削除済み事業者もロードする（復旧操作のため）。
 */
export function resolveCorporation(req: Request, res: Response, next: NextFunction): void {
  const raw = req.params.id;
  const numericId = Number(raw);
  const isNumeric = Number.isInteger(numericId) && numericId > 0;

  const sql = isNumeric
    ? "SELECT id, code, name, status, deleted_at FROM corporations WHERE id = ?"
    : "SELECT id, code, name, status, deleted_at FROM corporations WHERE code = ?";
  const param = isNumeric ? numericId : raw;

  pool
    .query(sql, [param])
    .then(([rows]) => {
      const corp = (rows as Record<string, unknown>[])[0];
      if (!corp) {
        res.status(404).json({ error: "CORPORATION_NOT_FOUND" });
        return;
      }
      req.corporation = corp as Request["corporation"];
      next();
    })
    .catch(next);
}
