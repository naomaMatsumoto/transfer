import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { safeJsonParse } from "../../../lib/safeJson";

export default async function listEvents(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const { from, to } = req.query;
  const storePlaceholders = ph(storeIds);
  const conditions: string[] = [`ct.store_id IN (${storePlaceholders})`];
  const params: unknown[] = [...storeIds];
  if (from && to) {
    conditions.push("e.starts_at BETWEEN ? AND ?");
    params.push(from, to);
  }
  const where = "WHERE " + conditions.join(" AND ");
  const [rows] = await pool.query(
    `
    SELECT
      e.id,
      e.class_type_id,
      ct.name AS class_type_name,
      e.starts_at,
      e.ends_at,
      e.capacity,
      e.status,
      COALESCE(SUM(CASE WHEN r.status IN ('booked','attended') THEN 1 ELSE 0 END), 0) AS reserved_count,
      (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', s.id, 'name', s.name))
       FROM event_staff es
       JOIN staff s ON s.id = es.staff_id
       WHERE es.event_id = e.id) AS staff
    FROM events e
    LEFT JOIN reservations r ON r.event_id = e.id
    LEFT JOIN class_types ct ON ct.id = e.class_type_id
    ${where}
    GROUP BY e.id
    ORDER BY e.starts_at ASC
  `,
    params,
  );
  const events = rows as Record<string, unknown>[];
  const normalized = events.map((ev) => ({
    ...ev,
    staff: safeJsonParse<{ id: number; name: string }[]>(ev.staff, []),
  }));
  ok(res, normalized);
}
