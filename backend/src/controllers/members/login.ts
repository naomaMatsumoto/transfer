import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { badRequest, unauthorized, forbidden, ok } from "../../lib/respond";

export default async function membersLogin(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const body = req.body as { email?: string; password?: string };
  const email = body.email != null ? String(body.email).trim().toLowerCase() : "";
  const password = body.password != null ? String(body.password) : "";
  if (!email || !password) {
    badRequest(res, ERR.EMAIL_PASSWORD_REQUIRED);
    return;
  }

  const [rows] = await pool.query("SELECT id, password_hash, status FROM users WHERE email = ? LIMIT 1", [email]);
  const user = (rows as { id: number; password_hash: string | null; status: string }[])[0];
  if (!user) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }
  if (user.status === "paused") {
    forbidden(res, ERR.MEMBER_PAUSED, "アカウントが一時停止中です。管理者にお問い合わせください。");
    return;
  }
  if (user.status === "withdrawn") {
    forbidden(res, ERR.MEMBER_WITHDRAWN, "退会済みのアカウントです。");
    return;
  }
  if (!user.password_hash) {
    unauthorized(res, ERR.PASSWORD_NOT_SET);
    return;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }

  if (req.session) {
    req.session.memberId = user.id;
  }
  ok(res, { id: user.id });
}
