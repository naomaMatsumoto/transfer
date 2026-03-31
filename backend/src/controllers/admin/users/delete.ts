import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";
import type { RowDataPacket, UpdateResult } from "../../../types/db";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function deleteUser(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const id = Number(req.params.id);
  const placeholders = ph(storeIds);
  const [refCredits] = await pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
  const [refRes] = await pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
  if ((refCredits as RowDataPacket[]).length > 0 || (refRes as RowDataPacket[]).length > 0) {
    badRequest(res, ERR.MEMBER_DELETE_HAS_REFERENCES);
    return;
  }
  const [result] = await pool.query(`DELETE FROM users WHERE id = ? AND store_id IN (${placeholders})`, [
    id,
    ...storeIds,
  ]);
  if ((result as UpdateResult).affectedRows === 0) {
    notFound(res, ERR.MEMBER_NOT_FOUND);
    return;
  }
  void writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId,
    action: "member.delete",
    targetType: "user",
    targetId: id,
  });
  ok(res, { id, deleted: true });
}
