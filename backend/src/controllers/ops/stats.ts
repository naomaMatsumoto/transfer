import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ok } from "../../lib/respond";

export default async function getStats(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  // サマリーを並列で取得（11個の相関サブクエリ → 独立した並列クエリに分割）
  const [
    [corpRows],
    [[storesRow]],
    [[accountsRow]],
    [[membersRow]],
    [[reservationsRow]],
    [[eventsRow]],
  ] = await Promise.all([
    pool.query("SELECT status, COUNT(*) AS cnt FROM corporations WHERE deleted_at IS NULL GROUP BY status"),
    pool.query("SELECT COUNT(*) AS total FROM stores"),
    pool.query("SELECT COUNT(*) AS total FROM accounts"),
    pool.query("SELECT COUNT(*) AS total FROM users"),
    pool.query("SELECT COUNT(*) AS total, SUM(status = 'booked') AS active FROM reservations"),
    pool.query("SELECT COUNT(*) AS total FROM events"),
  ]) as unknown as [
    [{ status: string; cnt: number }[], unknown],
    [{ total: number }[], unknown],
    [{ total: number }[], unknown],
    [{ total: number }[], unknown],
    [{ total: number; active: number }[], unknown],
    [{ total: number }[], unknown],
  ];

  const statusMap = Object.fromEntries(
    (corpRows as { status: string; cnt: number }[]).map((r) => [r.status, Number(r.cnt)])
  );
  const totalCorps = Object.values(statusMap).reduce((s, n) => s + n, 0);
  const summary = {
    total_corporations: totalCorps,
    pending_corporations: statusMap["pending"] ?? 0,
    email_sent_corporations: statusMap["email_sent"] ?? 0,
    active_corporations: statusMap["active"] ?? 0,
    suspended_corporations: statusMap["suspended"] ?? 0,
    total_stores: Number((storesRow as { total: number }).total),
    total_accounts: Number((accountsRow as { total: number }).total),
    total_members: Number((membersRow as { total: number }).total),
    total_reservations: Number((reservationsRow as { total: number }).total),
    active_reservations: Number((reservationsRow as { active: number }).active),
    total_events: Number((eventsRow as { total: number }).total),
  };

  // 法人別集計：相関サブクエリ → LEFT JOIN GROUP BY に変更
  const [perCorp] = await pool.query(`
    SELECT
      c.id, c.code, c.name, c.status,
      COUNT(DISTINCT s.id)  AS store_count,
      COUNT(DISTINCT a.id)  AS account_count,
      COUNT(DISTINCT u.id)  AS member_count,
      COUNT(DISTINCT r.id)  AS reservation_count
    FROM corporations c
    LEFT JOIN stores s   ON s.corporation_id = c.id
    LEFT JOIN accounts a ON a.corporation_id = c.id
    LEFT JOIN users u    ON u.store_id = s.id
    LEFT JOIN class_types ct ON ct.store_id = s.id
    LEFT JOIN events e   ON e.class_type_id = ct.id
    LEFT JOIN reservations r ON r.event_id = e.id
    WHERE c.deleted_at IS NULL
    GROUP BY c.id, c.code, c.name, c.status
    ORDER BY c.name ASC
  `);

  ok(res, { summary, perCorporation: perCorp });
}
