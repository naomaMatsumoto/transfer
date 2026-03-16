import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../db";
import { forbidden } from "./respond";

/** 店舗IDキャッシュの有効期限（ミリ秒） */
const STORE_IDS_CACHE_TTL_MS = 5 * 60 * 1000; // 5分

/**
 * ログイン中の法人に属する店舗ID一覧を取得する（内部実装）。
 * セッションにキャッシュし、5分以内は DB を叩かない。
 */
async function getStoreIdsForRequest(req: Request): Promise<number[]> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) return [];

  const now = Date.now();
  const cached = req.session.cachedStoreIds;
  const cachedFor = req.session.cachedStoreIdsCorporationId;
  const cachedAt = req.session.cachedStoreIdsAt ?? 0;

  if (cached && cachedFor === corporationId && now - cachedAt < STORE_IDS_CACHE_TTL_MS) {
    return cached;
  }

  const [rows] = await pool.query(
    "SELECT id FROM stores WHERE corporation_id = ? ORDER BY id ASC",
    [corporationId]
  );
  const list = rows as { id: number }[];
  const ids = Array.isArray(list) ? list.map((r) => r.id) : [];

  req.session.cachedStoreIds = ids;
  req.session.cachedStoreIdsCorporationId = corporationId;
  req.session.cachedStoreIdsAt = now;

  return ids;
}

/**
 * 現在のリクエストで有効な店舗ID一覧を返す。
 * - ops の store スコープルート (req.storeId が設定済み) の場合は [req.storeId]
 * - それ以外は getStoreIdsForRequest(req)（管理画面の法人に属する店舗一覧）
 */
export async function getStoreIds(req: Request): Promise<number[]> {
  if (req.storeId != null) return [req.storeId];
  return getStoreIdsForRequest(req);
}

/**
 * Admin ルート用ミドルウェア。
 * getStoreIds で店舗IDリストを取得し、req.storeIds にセットする。
 * 店舗が0件（ログイン不正・未設定）なら 403 を返して処理を止める。
 */
export async function requireStoreAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const ids = await getStoreIds(req);
  if (ids.length === 0) {
    forbidden(res);
    return;
  }
  req.storeIds = ids;
  next();
}
