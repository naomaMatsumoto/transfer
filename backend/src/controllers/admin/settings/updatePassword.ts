import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { unauthorized, badRequest, notFound, ok } from "../../../lib/respond";

export default async function updatePassword(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const accountId = req.session?.account?.accountId;
  if (accountId == null) {
    unauthorized(res);
    return;
  }
  const body = req.body as { currentPassword?: string; newPassword?: string };
  const { currentPassword, newPassword } = body;
  if (!currentPassword || typeof currentPassword !== "string" || !newPassword || typeof newPassword !== "string") {
    badRequest(res, "CURRENT_AND_NEW_PASSWORD_REQUIRED");
    return;
  }
  if (String(newPassword).length < 6) {
    badRequest(res, "NEW_PASSWORD_TOO_SHORT");
    return;
  }
  const [rows] = await pool.query(
    "SELECT password_hash FROM accounts WHERE id = ?",
    [accountId]
  );
  const account = (rows as { password_hash: string }[])[0];
  if (!account) {
    notFound(res, "NOT_FOUND");
    return;
  }
  const match = await bcrypt.compare(currentPassword, account.password_hash);
  if (!match) {
    badRequest(res, "CURRENT_PASSWORD_INVALID");
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE accounts SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, accountId]);
  ok(res, { ok: true });
}
