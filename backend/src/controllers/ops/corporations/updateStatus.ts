import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";
import { badRequest, ok } from "../../../lib/respond";

export default async function updateStatus(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corp = req.corporation!;
  const { status } = req.body as { status?: string };
  const allowed = ["pending", "email_sent", "active", "suspended"] as const;
  if (!status || !allowed.includes(status as (typeof allowed)[number])) {
    badRequest(res, "INVALID_STATUS");
    return;
  }

  await pool.query("UPDATE corporations SET status = ? WHERE id = ?", [status, corp.id]);
  await opsAudit(req, "corporation.updateStatus", "corporation", corp.id, { status });
  ok(res, { ok: true, status });
}
