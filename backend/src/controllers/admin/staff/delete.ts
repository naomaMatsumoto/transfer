import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function deleteStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const id = Number(req.params.id);
  const placeholders = ph(storeIds);
  const [result] = await pool.query(
    `DELETE FROM staff WHERE id = ? AND store_id IN (${placeholders})`,
    [id, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, ERR.STAFF_NOT_FOUND);
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "staff.delete",
    targetType: "staff",
    targetId: id,
    detail: null,
  });
  ok(res, { id, deleted: true });
}
