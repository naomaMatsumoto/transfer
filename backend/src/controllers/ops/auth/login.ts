import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";

export default async function opsLogin(
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
    "SELECT id, email, password_hash, display_name FROM platform_admins WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const admin = (rows as { id: number; email: string; password_hash: string; display_name: string | null }[])[0];
  if (!admin) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }
  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
    return;
  }
  if (!req.session) {
    res.status(500).json({ error: "SESSION_NOT_AVAILABLE" });
    return;
  }
  req.session.platformAdmin = { id: admin.id, email: admin.email };
  res.json({
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
  });
}
