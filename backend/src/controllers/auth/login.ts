import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";
import { ERR } from "../../constants";

export default async function login(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { email?: string; password?: string };
  const { email, password } = body;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    return;
  }
  const [rows] = await pool.query(
    "SELECT id, corporation_id, email, password_hash, display_name FROM accounts WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const account = (rows as { id: number; corporation_id: number; email: string; password_hash: string; display_name: string | null }[])[0];
  if (!account) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }
  const match = await bcrypt.compare(password, account.password_hash);
  if (!match) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }
  if (!req.session) {
    res.status(500).json({ error: "SESSION_NOT_AVAILABLE" });
    return;
  }
  req.session.account = {
    accountId: account.id,
    corporationId: account.corporation_id,
    email: account.email,
  };
  res.json({
    accountId: account.id,
    corporationId: account.corporation_id,
    email: account.email,
    displayName: account.display_name,
  });
}
