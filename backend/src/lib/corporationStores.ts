import { Request } from "express";
import { pool } from "../db";

/**
 * ログイン中の法人に属する店舗ID一覧を取得する。
 * 未ログインや corporationId がない場合は空配列を返す。
 * 管理APIでは storeIds.length === 0 のとき 403 を返すこと。
 */
export async function getStoreIdsForRequest(req: Request): Promise<number[]> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) return [];
  const [rows] = await pool.query(
    "SELECT id FROM stores WHERE corporation_id = ? ORDER BY id ASC",
    [corporationId]
  );
  const list = rows as { id: number }[];
  return Array.isArray(list) ? list.map((r) => r.id) : [];
}
