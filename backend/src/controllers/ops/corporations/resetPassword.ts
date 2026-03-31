import crypto from "crypto";
import bcrypt from "bcrypt";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, findOwned, opsAudit } from "../../../lib/opsHelpers";
import { badRequest, notFound, ok } from "../../../lib/respond";

export default async function resetPassword(req: Request, res: Response, _next: NextFunction): Promise<void> {
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

  const newPw = crypto.randomBytes(12).toString("base64url").slice(0, 16);
  const hashed = await bcrypt.hash(newPw, 10);
  await pool.query("UPDATE accounts SET password_hash = ? WHERE id = ?", [hashed, accountId]);
  await opsAudit(req, "account.resetPassword", "account", accountId);
  ok(res, { newPassword: newPw });
}
