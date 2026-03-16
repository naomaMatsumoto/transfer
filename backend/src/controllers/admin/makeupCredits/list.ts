import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

const DEFAULT_LIMIT = 50;

export default async function listMakeupCredits(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const storePh = ph(storeIds);
  const { userId, status, page: pageStr, limit: limitStr } = req.query;

  const page = Math.max(1, parseInt(String(pageStr ?? "1"), 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(limitStr ?? String(DEFAULT_LIMIT)), 10) || DEFAULT_LIMIT));
  const offset = (page - 1) * limit;

  const conditions: string[] = [`u.store_id IN (${storePh})`];
  const filterParams: unknown[] = [...storeIds];

  if (userId) {
    conditions.push("mc.user_id = ?");
    filterParams.push(Number(userId));
  }
  if (status) {
    conditions.push("mc.status = ?");
    filterParams.push(status);
  }

  const where = "WHERE " + conditions.join(" AND ");
  const joins = "LEFT JOIN users u ON u.id = mc.user_id LEFT JOIN class_types ct ON ct.id = mc.class_type_id";

  const [[countRow]] = (await pool.query(
    `SELECT COUNT(*) AS total FROM makeup_credits mc ${joins} ${where}`,
    filterParams,
  )) as unknown as [[{ total: number }], unknown];

  const [rows] = await pool.query(
    `SELECT mc.id, mc.user_id, u.name AS user_name, mc.class_type_id, ct.name AS class_type_name,
            mc.granted_at, mc.expires_at, mc.status, mc.source, mc.source_event_id, mc.note, mc.created_by
     FROM makeup_credits mc ${joins} ${where}
     ORDER BY mc.granted_at DESC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );

  ok(res, { data: rows, total: Number(countRow.total), page, limit });
}
