import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, findOwned, opsAudit } from "../../../lib/opsHelpers";
import { badRequest, notFound, ok } from "../../../lib/respond";

export default async function deleteStore(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const storeId = parseIntParam(req, "storeId");
  if (!storeId) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const store = await findOwned("stores", storeId, corp.id, "id, name");
  if (!store) {
    notFound(res, "STORE_NOT_FOUND");
    return;
  }

  await pool.query("DELETE FROM stores WHERE id = ?", [storeId]);
  await opsAudit(req, "store.delete", "store", storeId, { name: (store as { name: string }).name });
  ok(res, { ok: true });
}
