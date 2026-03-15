import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { forbidden, badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function reportSummary(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const storePh = ph(storeIds);

  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) {
    badRequest(res, "FROM_TO_REQUIRED");
    return;
  }

  const [reservationRows] = await pool.query(
    `SELECT
       DATE_FORMAT(e.starts_at, '%Y-%m') AS month,
       COUNT(*) AS total_reservations,
       SUM(CASE WHEN r.status = 'booked' THEN 1 ELSE 0 END) AS booked,
       SUM(CASE WHEN r.status = 'attended' THEN 1 ELSE 0 END) AS attended,
       SUM(CASE WHEN r.status = 'no_show' THEN 1 ELSE 0 END) AS no_show,
       SUM(CASE WHEN r.status LIKE 'canceled%' THEN 1 ELSE 0 END) AS canceled,
       SUM(CASE WHEN r.reservation_type = 'makeup' AND r.status IN ('booked','attended') THEN 1 ELSE 0 END) AS makeup_used
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     JOIN class_types ct ON ct.id = e.class_type_id
     WHERE ct.store_id IN (${storePh})
       AND e.starts_at >= ? AND e.starts_at < ?
     GROUP BY month ORDER BY month`,
    [...storeIds, from, to]
  );

  const [absenceRows] = await pool.query(
    `SELECT
       DATE_FORMAT(e.starts_at, '%Y-%m') AS month,
       COUNT(*) AS absence_count
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     JOIN class_types ct ON ct.id = e.class_type_id
     WHERE ct.store_id IN (${storePh})
       AND r.status = 'no_show'
       AND e.starts_at >= ? AND e.starts_at < ?
     GROUP BY month ORDER BY month`,
    [...storeIds, from, to]
  );

  const [memberStats] = await pool.query(
    `SELECT
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_members,
       SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) AS paused_members,
       SUM(CASE WHEN status = 'withdrawn' THEN 1 ELSE 0 END) AS withdrawn_members
     FROM users WHERE store_id IN (${storePh})`,
    storeIds
  );

  ok(res, {
    reservationsByMonth: reservationRows,
    absencesByMonth: absenceRows,
    memberStats: (memberStats as unknown[])[0],
  });
}
