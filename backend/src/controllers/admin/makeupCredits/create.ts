import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, created } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function createMakeupCredit(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const body = req.body as {
    userId?: number;
    classTypeId?: number | null;
    expiresAt?: string | null;
    note?: string;
    createdBy?: string;
  };
  const { userId, classTypeId, expiresAt, note, createdBy } = body;
  if (!userId) {
    badRequest(res, ERR.CREDIT_USER_ID_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const [userRows] = await pool.query(`SELECT id FROM users WHERE id = ? AND store_id IN (${storePh})`, [
    userId,
    ...storeIds,
  ]);
  if ((userRows as unknown[]).length === 0) {
    notFound(res, ERR.CREDIT_NOT_FOUND);
    return;
  }
  if (classTypeId != null) {
    const [ctRows] = await pool.query(`SELECT id FROM class_types WHERE id = ? AND store_id IN (${storePh})`, [
      classTypeId,
      ...storeIds,
    ]);
    if ((ctRows as unknown[]).length === 0) {
      notFound(res, ERR.CLASS_TYPE_NOT_FOUND);
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
  const insertId = (result as { insertId: number }).insertId;
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "credit.create",
    targetType: "credit",
    targetId: insertId,
    detail: { userId },
  });
  created(res, { id: insertId });
}
