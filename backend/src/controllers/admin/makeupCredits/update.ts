import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function updateMakeupCredit(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const creditId = Number(req.params.id);
  const body = req.body as { status?: string; expiresAt?: string | null; note?: string };
  const { status, expiresAt, note } = body;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (status) {
    sets.push("mc.status = ?");
    params.push(status);
  }
  if (expiresAt !== undefined) {
    sets.push("mc.expires_at = ?");
    params.push(expiresAt);
  }
  if (note !== undefined) {
    sets.push("mc.note = ?");
    params.push(note);
  }
  if (sets.length === 0) {
    badRequest(res, ERR.CREDIT_UPDATE_EMPTY);
    return;
  }
  sets.push("mc.updated_at = NOW()");
  const storePh = ph(storeIds);
  params.push(creditId, ...storeIds);
  const [result] = await pool.query(
    `UPDATE makeup_credits mc JOIN users u ON u.id = mc.user_id SET ${sets.join(", ")} WHERE mc.id = ? AND u.store_id IN (${storePh})`,
    params,
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.CREDIT_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "credit.update",
    targetType: "credit",
    targetId: creditId,
    detail: null,
  });
  ok(res, { id: creditId, updated: true });
}
