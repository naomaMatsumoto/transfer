import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

const DEFAULT_LIMIT = 50;

export default async function listReservations(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const storePh = ph(storeIds);
  const { eventId, userId, page: pageStr, limit: limitStr } = req.query;

  const page = Math.max(1, parseInt(String(pageStr ?? "1"), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(limitStr ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const conditions: string[] = [`(ct.store_id IN (${storePh}) AND u.store_id IN (${storePh}))`];
  const filterParams: unknown[] = [...storeIds, ...storeIds];

  if (eventId) {
    conditions.push("r.event_id = ?");
    filterParams.push(Number(eventId));
  }
  if (userId) {
    conditions.push("r.user_id = ?");
    filterParams.push(Number(userId));
  }

  const where = "WHERE " + conditions.join(" AND ");
  const joins =
    "LEFT JOIN users u ON u.id = r.user_id " +
    "LEFT JOIN events e ON e.id = r.event_id " +
    "LEFT JOIN class_types ct ON ct.id = e.class_type_id";

  const [[countRow]] = (await pool.query(
    `SELECT COUNT(*) AS total FROM reservations r ${joins} ${where}`,
    filterParams,
  )) as unknown as [[{ total: number }], unknown];

  const [rows] = await pool.query(
    `SELECT r.id, r.user_id, u.name AS user_name, r.event_id, e.starts_at,
            ct.name AS class_type_name, r.reservation_type, r.makeup_credit_id,
            r.status, r.created_at, r.canceled_at
     FROM reservations r ${joins} ${where}
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );

  ok(res, { data: rows, total: Number(countRow.total), page, limit });
}
