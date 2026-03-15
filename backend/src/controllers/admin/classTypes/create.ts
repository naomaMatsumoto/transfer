import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { forbidden, badRequest, created } from "../../../lib/respond";
import { writeAuditLog } from "../../../lib/auditLog";

function generateClassTypeCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff-]/g, "");
  if (slug.length > 0 && slug.length <= 50) return slug;
  return "ct_" + String(Date.now());
}

export default async function createClassType(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const storeId = storeIds[0];
  const body = req.body as { code?: string; name?: string; description?: string };
  const { code, name, description } = body;
  if (!name || !String(name).trim()) {
    badRequest(res, ERR.CLASS_TYPE_NAME_REQUIRED);
    return;
  }
  const trimmedName = String(name).trim();
  const codeToUse =
    code && String(code).trim() ? String(code).trim() : generateClassTypeCode(trimmedName);
  try {
    const [result] = await pool.query(
      "INSERT INTO class_types (store_id, code, name, description) VALUES (?, ?, ?, ?)",
      [storeId, codeToUse, trimmedName, description ?? null]
    );
    const insertId = (result as { insertId: number }).insertId;
    await writeAuditLog({
      actorType: "admin",
      actorId: req.session?.account?.accountId ?? null,
      action: "class_type.create",
      targetType: "class_type",
      targetId: insertId,
      detail: { name: trimmedName, code: codeToUse },
    });
    created(res, { id: insertId, code: codeToUse, name: trimmedName });
  } catch (err: unknown) {
    const e = err as { code?: string };
    if (e.code === "ER_DUP_ENTRY") {
      badRequest(res, ERR.CLASS_TYPE_CODE_DUPLICATE);
      return;
    }
    throw err;
  }
}
