import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function createMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
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
  const storePh = storeIds.map(() => "?").join(",");
  const [userRows] = await pool.query(
    `SELECT id FROM users WHERE id = ? AND store_id IN (${storePh})`,
    [userId, ...storeIds]
  );
  if ((userRows as unknown[]).length === 0) {
    res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    return;
  }
  if (classTypeId != null) {
    const [ctRows] = await pool.query(
      `SELECT id FROM class_types WHERE id = ? AND store_id IN (${storePh})`,
      [classTypeId, ...storeIds]
    );
    if ((ctRows as unknown[]).length === 0) {
      res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      return;
    }
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
