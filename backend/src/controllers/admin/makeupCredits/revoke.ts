import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function revokeMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const creditId = Number(req.params.id);
  const storePh = ph(storeIds);
  const [result] = await pool.query(
    `UPDATE makeup_credits mc JOIN users u ON u.id = mc.user_id SET mc.status = 'revoked', mc.updated_at = NOW() WHERE mc.id = ? AND u.store_id IN (${storePh})`,
    [creditId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.CREDIT_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "credit.revoke",
    targetType: "credit",
    targetId: creditId,
    detail: null,
  });
  ok(res, { id: creditId, status: "revoked" });
}
