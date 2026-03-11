import { type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { pool } from "../../db";
import { sendPasswordResetEmail } from "../../mailer";

const FRONTEND_BASE = (process.env.FRONTEND_BASE_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
const RESET_EXPIRES_HOURS = 1;

export default async function membersForgotPassword(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { email?: string };
  const email = body.email != null ? String(body.email).trim().toLowerCase() : "";
  if (!email) {
    res.status(400).json({ error: "EMAIL_REQUIRED" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT id FROM users WHERE email = ? AND status = 'active' LIMIT 1",
    [email]
  );
  const user = (rows as { id: number }[])[0];
  if (!user) {
    res.json({ ok: true });
    return;
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_EXPIRES_HOURS * 60 * 60 * 1000);
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [user.id, token, expiresAt]
  );

  const [userEmail] = await pool.query("SELECT email FROM users WHERE id = ?", [user.id]);
  const to = (userEmail as { email: string | null }[])[0]?.email;
  if (to) {
    const resetUrl = `${FRONTEND_BASE}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(to, resetUrl);
  }

  res.json({ ok: true });
}
