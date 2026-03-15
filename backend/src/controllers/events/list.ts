import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { badRequest, ok } from "../../lib/respond";

export default async function listEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { from, to, userId, storeId } = req.query;
  if (!from || !to) {
    badRequest(res, ERR.EVENTS_FROM_TO_REQUIRED);
    return;
  }
  const userIdNum = userId ? Number(userId) : 0;
  const storeIdNum = storeId ? Number(storeId) : 0;
  const whereStore = storeIdNum > 0 ? " AND ct.store_id = ?" : "";
  const params: (string | number)[] = [userIdNum, String(from), String(to)];
  if (storeIdNum > 0) params.push(storeIdNum);
  const [rows] = await pool.query(
    `
    SELECT
      e.id,
      e.class_type_id,
      ct.name AS class_type_name,
      e.starts_at,
      e.ends_at,
      e.capacity,
      e.status AS event_status,
      COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count,
      MAX(CASE WHEN r.user_id = ? AND r.status IN ('booked','attended') THEN 1 ELSE 0 END) AS is_reserved_by_user
    FROM events e
    LEFT JOIN reservations r ON r.event_id = e.id
    LEFT JOIN class_types ct ON ct.id = e.class_type_id
    WHERE e.starts_at BETWEEN ? AND ?${whereStore}
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `,
    params,
  );
  ok(res, rows);
}
