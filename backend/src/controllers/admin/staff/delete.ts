import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";

export default async function deleteStaff(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const id = Number(req.params.id);
  const placeholders = ph(storeIds);
  const [result] = await pool.query(`DELETE FROM staff WHERE id = ? AND store_id IN (${placeholders})`, [
    id,
    ...storeIds,
  ]);
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.STAFF_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: adminActorId(req),
    action: "staff.delete",
    targetType: "staff",
    targetId: id,
    detail: null,
  });
  ok(res, { id, deleted: true });
}
