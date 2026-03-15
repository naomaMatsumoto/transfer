import type { Pool, PoolConnection } from "mysql2/promise";
import { ph } from "../lib/validate";

/**
 * イベントへのスタッフ割当を同期する。
 * create / createBulk / putStaff の3箇所で同じロジックが重複していたため共通化。
 *
 * @param conn  - トランザクション中の接続、またはプール
 * @param eventId   - 割り当て先イベント ID
 * @param staffIds  - 割り当てるスタッフ ID 配列（重複・不正値は除外）
 * @param storeIds  - 権限チェック用の店舗 ID 配列
 * @param replace   - true の場合は既存割当を削除してから挿入（putStaff 用）
 */
export async function syncEventStaff(
  conn: Pool | PoolConnection,
  eventId: number,
  staffIds: unknown[],
  storeIds: number[],
  replace = false,
): Promise<void> {
  if (replace) {
    await conn.query("DELETE FROM event_staff WHERE event_id = ?", [eventId]);
  }

  const validIds = Array.isArray(staffIds)
    ? [...new Set(staffIds.filter((id) => Number.isInteger(id) && (id as number) > 0) as number[])]
    : [];

  if (validIds.length === 0) return;

  const storePh = ph(storeIds);
  for (const staffId of validIds) {
    const [rows] = await conn.query(
      `SELECT id FROM staff WHERE id = ? AND store_id IN (${storePh})`,
      [staffId, ...storeIds],
    );
    if ((rows as unknown[]).length > 0) {
      await conn.query(
        "INSERT INTO event_staff (event_id, staff_id) VALUES (?, ?)",
        [eventId, staffId],
      );
    }
  }
}
