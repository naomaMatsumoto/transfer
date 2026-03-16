import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, findOwned, opsAudit } from "../../../lib/opsHelpers";
import { badRequest, notFound, ok } from "../../../lib/respond";

export default async function deleteAccount(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corp = req.corporation!;
  const accountId = parseIntParam(req, "accountId");
  if (!accountId) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const account = await findOwned("accounts", accountId, corp.id, "id, email");
  if (!account) {
    notFound(res, "ACCOUNT_NOT_FOUND");
    return;
  }

  const [countRows] = await pool.query("SELECT COUNT(*) AS n FROM accounts WHERE corporation_id = ?", [corp.id]);
  const count = (countRows as { n: number }[])[0]?.n ?? 0;
  if (count <= 1) {
    badRequest(res, "AT_LEAST_ONE_ACCOUNT_REQUIRED");
    return;
  }

  await pool.query("DELETE FROM accounts WHERE id = ?", [accountId]);
  await opsAudit(req, "account.delete", "account", accountId, {
    email: (account as { email: string }).email,
  });
  ok(res, { ok: true });
}
