import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ok } from "../../lib/respond";

export default async function getStats(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [summaryRows] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM corporations WHERE deleted_at IS NULL) AS total_corporations,
      (SELECT COUNT(*) FROM corporations WHERE status = 'pending' AND deleted_at IS NULL) AS pending_corporations,
      (SELECT COUNT(*) FROM corporations WHERE status = 'email_sent' AND deleted_at IS NULL) AS email_sent_corporations,
      (SELECT COUNT(*) FROM corporations WHERE status = 'active' AND deleted_at IS NULL) AS active_corporations,
      (SELECT COUNT(*) FROM corporations WHERE status = 'suspended' AND deleted_at IS NULL) AS suspended_corporations,
      (SELECT COUNT(*) FROM stores) AS total_stores,
      (SELECT COUNT(*) FROM accounts) AS total_accounts,
      (SELECT COUNT(*) FROM users) AS total_members,
      (SELECT COUNT(*) FROM reservations) AS total_reservations,
      (SELECT COUNT(*) FROM reservations WHERE status = 'booked') AS active_reservations,
      (SELECT COUNT(*) FROM events) AS total_events
  `);
  const summary = (summaryRows as Record<string, unknown>[])[0];

  const [perCorp] = await pool.query(`
    SELECT
      c.id, c.code, c.name, c.status,
      (SELECT COUNT(*) FROM stores s WHERE s.corporation_id = c.id) AS store_count,
      (SELECT COUNT(*) FROM accounts a WHERE a.corporation_id = c.id) AS account_count,
      (SELECT COUNT(*) FROM users u
        JOIN stores s2 ON u.store_id = s2.id
        WHERE s2.corporation_id = c.id) AS member_count,
      (SELECT COUNT(*) FROM reservations r
        JOIN events e ON r.event_id = e.id
        JOIN class_types ct ON e.class_type_id = ct.id
        JOIN stores s3 ON ct.store_id = s3.id
        WHERE s3.corporation_id = c.id) AS reservation_count
    FROM corporations c
    WHERE c.deleted_at IS NULL
    ORDER BY c.name ASC
  `);

  ok(res, { summary, perCorporation: perCorp });
}
