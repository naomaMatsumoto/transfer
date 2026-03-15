import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function updateStaff(
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
  ok(res, { id, name: trimmed, updated: true });
}
