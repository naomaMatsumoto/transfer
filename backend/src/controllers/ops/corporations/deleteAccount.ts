import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, findOwned, opsAudit } from "../../../lib/opsHelpers";

export default async function deleteAccount(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const accountId = parseIntParam(req, "accountId");
  if (!accountId) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }

  const account = await findOwned("accounts", accountId, corp.id, "id, email");
  if (!account) {
    res.status(404).json({ error: "ACCOUNT_NOT_FOUND" });
    return;
  }

  await pool.query("DELETE FROM accounts WHERE id = ?", [accountId]);
  await opsAudit(req, "account.delete", "account", accountId, {
    email: (account as { email: string }).email,
  });
  res.json({ ok: true });
}
