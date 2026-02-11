import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function listMakeupCredits(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const { userId, status } = req.query;
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (userId) {
    conditions.push("mc.user_id = ?");
    params.push(Number(userId));
  }
  if (status) {
    conditions.push("mc.status = ?");
    params.push(status);
  }
  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const sql =
    "SELECT mc.id, mc.user_id, u.name AS user_name, mc.class_type_id, ct.name AS class_type_name, mc.granted_at, mc.expires_at, mc.status, mc.source, mc.source_event_id, mc.note, mc.created_by FROM makeup_credits mc LEFT JOIN users u ON u.id = mc.user_id LEFT JOIN class_types ct ON ct.id = mc.class_type_id " +
    where +
    " ORDER BY mc.granted_at DESC";
  const [rows] = await pool.query(sql, params);
  res.json(rows);
}
