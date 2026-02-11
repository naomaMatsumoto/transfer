import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function createMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as {
    userId?: number;
    classTypeId?: number | null;
    expiresAt?: string | null;
    note?: string;
    createdBy?: string;
  };
  const { userId, classTypeId, expiresAt, note, createdBy } = body;
  if (!userId) {
    res.status(400).json({ error: ERR.CREDIT_USER_ID_REQUIRED });
    return;
  }
  const sql =
    "INSERT INTO makeup_credits (user_id, class_type_id, granted_at, expires_at, status, source, note, created_by) VALUES (?, ?, NOW(), ?, 'granted', 'admin_holiday', ?, ?)";
  const [result] = await pool.query(sql, [
    userId,
    classTypeId ?? null,
    expiresAt ?? null,
    note ?? null,
    createdBy ?? "admin",
  ]);
  res.status(201).json({ id: (result as { insertId: number }).insertId });
}
