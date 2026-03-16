import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { unauthorized, badRequest, notFound, ok } from "../../../lib/respond";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function updateCorporationName(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) {
    unauthorized(res);
    return;
  }
  const body = req.body as { name?: string };
  const name = body.name != null ? String(body.name).trim() : "";
  if (!name) {
    badRequest(res, "NAME_REQUIRED");
    return;
  }
  const [result] = await pool.query("UPDATE corporations SET name = ?, updated_at = NOW() WHERE id = ?", [
    name,
    corporationId,
  ]);
  if ((result as { affectedRows: number }).affectedRows === 0) {
    notFound(res, "NOT_FOUND");
    return;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "settings.update_corporation",
    targetType: "corporation",
    targetId: req.session?.account?.corporationId ?? null,
    detail: null,
  });
  ok(res, { ok: true, name });
}
