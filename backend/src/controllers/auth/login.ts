import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { badRequest, unauthorized, serverError, ok } from "../../lib/respond";
import { normalizeEmail } from "../../lib/validate";

export default async function login(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const body = req.body as { email?: string; password?: string };
  const { email, password } = body;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    badRequest(res, ERR.EMAIL_PASSWORD_REQUIRED);
    return;
  }
  const [rows] = await pool.query(
    "SELECT id, corporation_id, email, password_hash, display_name FROM accounts WHERE email = ? LIMIT 1",
    [normalizeEmail(email) ?? email.trim().toLowerCase()],
  );
  const account = (
    rows as { id: number; corporation_id: number; email: string; password_hash: string; display_name: string | null }[]
  )[0];
  if (!account) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }
  const match = await bcrypt.compare(password, account.password_hash);
  if (!match) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }
  if (!req.session) {
    serverError(res, "SESSION_NOT_AVAILABLE");
    return;
  }
  req.session.account = {
    accountId: account.id,
    corporationId: account.corporation_id,
    email: account.email,
  };
  ok(res, {
    accountId: account.id,
    corporationId: account.corporation_id,
    email: account.email,
    displayName: account.display_name,
  });
}
