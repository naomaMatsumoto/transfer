import { pool } from "../db";
import { ph } from "./validate";

/**
 * イベントが指定した店舗グループに属するか検証し、属する場合は event.id を返す。
 * 存在しない・権限外の場合は null を返す。
 *
 * class_types.store_id によるスコープチェックを共通化する。
 * getStaff / putStaff / deleteOne / updateStatus / updateTime / updateCapacity で使用。
 */
export async function findEventInStore(eventId: number, storeIds: number[]): Promise<number | null> {
  const storePh = ph(storeIds);
  const [rows] = await pool.query(
    `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [eventId, ...storeIds],
  );
  return (rows as { id: number }[])[0]?.id ?? null;
}
