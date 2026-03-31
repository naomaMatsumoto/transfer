import { pool } from "../db";
import type { PoolConnection } from "mysql2/promise";

/**
 * トランザクションのボイラープレートを共通化する。
 * コールバックが例外を投げた場合は自動的にロールバックし、
 * 正常完了時はコミットする。
 */
export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
