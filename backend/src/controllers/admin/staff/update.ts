import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function updateStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const id = Number(req.params.id);
  const body = req.body as { name?: string };
  const name = body.name;
  if (name === undefined) {
    badRequest(res, ERR.STAFF_UPDATE_EMPTY);
    return;
  }
  const trimmed = String(name).trim();
  if (trimmed.length === 0) {
    badRequest(res, ERR.STAFF_NAME_EMPTY);
    return;
  }
  const placeholders = ph(storeIds);
  const [result] = await pool.query(
    `UPDATE staff SET name = ? WHERE id = ? AND store_id IN (${placeholders})`,
    [trimmed, id, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.STAFF_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "staff.update",
    targetType: "staff",
    targetId: id,
    detail: null,
  });
  ok(res, { id, name: trimmed, updated: true });
}
