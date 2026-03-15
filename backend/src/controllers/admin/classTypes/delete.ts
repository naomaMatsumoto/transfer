import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { type UpdateResult, isMysqlError } from "../../../types/db";
import { forbidden, badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function deleteClassType(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const id = Number(req.params.id);
  const placeholders = ph(storeIds);
  try {
    const [result] = await pool.query(
      `DELETE FROM class_types WHERE id = ? AND store_id IN (${placeholders})`,
      [id, ...storeIds]
    );
    if ((result as UpdateResult).affectedRows === 0) {
      notFound(res, ERR.CLASS_TYPE_NOT_FOUND);
      return;
    }
    await writeAuditLog({
      actorType: "admin",
      actorId: req.session?.account?.accountId ?? null,
      action: "class_type.delete",
      targetType: "class_type",
      targetId: id,
      detail: null,
    });
    ok(res, { id, deleted: true });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_ROW_IS_REFERENCED_2") {
      badRequest(res, ERR.CLASS_TYPE_IN_USE);
      return;
    }
    throw err;
  }
}
