import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, created } from "../../../lib/respond";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function createStaff(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const storeId = storeIds[0];
  const body = req.body as { name?: string };
  const name = body.name;
  if (name === undefined || name === null) {
    badRequest(res, ERR.STAFF_NAME_REQUIRED);
    return;
  }
  const trimmed = String(name).trim();
  if (trimmed.length === 0) {
    badRequest(res, ERR.STAFF_NAME_EMPTY);
    return;
  }
  const [result] = await pool.query(
    "INSERT INTO staff (store_id, name) VALUES (?, ?)",
    [storeId, trimmed]
  );
  const insertId = (result as { insertId: number }).insertId;
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "staff.create",
    targetType: "staff",
    targetId: insertId,
    detail: { name: trimmed },
  });
  created(res, { id: insertId, name: trimmed });
}
