import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function listReservations(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const storePh = ph(storeIds);
  const conditions: string[] = [
    `(ct.store_id IN (${storePh}) AND u.store_id IN (${storePh}))`,
  ];
  const params: unknown[] = [...storeIds, ...storeIds];
  const { eventId, userId } = req.query;
  if (eventId) {
    conditions.push("r.event_id = ?");
    params.push(Number(eventId));
  }
  if (userId) {
    conditions.push("r.user_id = ?");
    params.push(Number(userId));
  }
  const where = "WHERE " + conditions.join(" AND ");
  const sql =
    `SELECT r.id, r.user_id, u.name AS user_name, r.event_id, e.starts_at, ct.name AS class_type_name, r.reservation_type, r.makeup_credit_id, r.status, r.created_at, r.canceled_at FROM reservations r LEFT JOIN users u ON u.id = r.user_id LEFT JOIN events e ON e.id = r.event_id LEFT JOIN class_types ct ON ct.id = e.class_type_id ` +
    where +
    " ORDER BY r.created_at DESC";
  const [rows] = await pool.query(sql, params);
  ok(res, rows);
}
