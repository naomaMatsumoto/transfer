import { type Request } from "express";
import { pool } from "../db";
import { writeAuditLog } from "./auditLog";

/**
 * req.params から整数パラメータを取得。不正なら null を返す。
 */
export function parseIntParam(req: Request, name: string): number | null {
  const v = Number(req.params[name]);
  return Number.isInteger(v) && v > 0 ? v : null;
}

/**
 * INSERT 結果から insertId を取得。
 */
export function getInsertId(result: unknown): number {
  return (result as { insertId: number }).insertId;
}

/**
 * UPDATE/DELETE 結果の affectedRows を返す。
 */
export function getAffectedRows(result: unknown): number {
  return (result as { affectedRows: number }).affectedRows;
}

/**
 * 事業者に紐づくエンティティを取得。存在しなければ null。
 */
export async function findOwned<T = Record<string, unknown>>(
  table: string,
  entityId: number,
  corporationId: number,
  columns = "*",
): Promise<T | null> {
  const [rows] = await pool.query(`SELECT ${columns} FROM ${table} WHERE id = ? AND corporation_id = ?`, [
    entityId,
    corporationId,
  ]);
  return (rows as T[])[0] ?? null;
}

/**
 * プラットフォーム管理者のアクションを監査ログに記録。
 */
export function opsAudit(
  req: Request,
  action: string,
  targetType?: string,
  targetId?: number,
  detail?: Record<string, unknown>,
): Promise<void> {
  return writeAuditLog({
    actorType: "platform",
    actorId: req.session?.platformAdmin?.id,
    action,
    targetType: targetType ?? null,
    targetId: targetId ?? null,
    detail: detail ?? null,
  });
}
