import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";
import { badRequest, notFound, ok } from "../../../lib/respond";

export default async function updateAccount(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corp = req.corporation!;
  const accountId = Number(req.params.accountId);
  const { role: rawRole } = req.body as { role?: string };

  if (rawRole !== "admin" && rawRole !== "staff") {
    badRequest(res, "ROLE_INVALID");
    return;
  }

  const [rows] = await pool.query("SELECT id FROM accounts WHERE id = ? AND corporation_id = ?", [accountId, corp.id]);
  if ((rows as unknown[]).length === 0) {
    notFound(res, "ACCOUNT_NOT_FOUND");
    return;
  }

  await pool.query("UPDATE accounts SET role = ? WHERE id = ?", [rawRole, accountId]);
  await opsAudit(req, "account.role_change", "account", accountId, { role: rawRole });
  ok(res, { id: accountId, role: rawRole });
}
