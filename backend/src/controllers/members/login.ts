import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";

export default async function membersLogin(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { email?: string; password?: string };
  const email = body.email != null ? String(body.email).trim().toLowerCase() : "";
  const password = body.password != null ? String(body.password) : "";
  if (!email || !password) {
    res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT id, password_hash FROM users WHERE email = ? AND status = 'active' LIMIT 1",
    [email]
  );
  const user = (rows as { id: number; password_hash: string | null }[])[0];
  if (!user) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }
  if (!user.password_hash) {
    res.status(401).json({ error: "PASSWORD_NOT_SET" });
    return;
  }
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }

  if (req.session) {
    req.session.memberId = user.id;
  }
  res.json({ id: user.id });
}
