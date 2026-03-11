import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";

export default async function membersResetPassword(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { token?: string; newPassword?: string };
  const token = body.token != null ? String(body.token).trim() : "";
  const newPassword = body.newPassword != null ? String(body.newPassword) : "";
  if (!token || !newPassword) {
    res.status(400).json({ error: "TOKEN_AND_PASSWORD_REQUIRED" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "NEW_PASSWORD_TOO_SHORT" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT user_id, expires_at FROM password_reset_tokens WHERE token = ? LIMIT 1",
    [token]
  );
  const row = (rows as { user_id: number; expires_at: Date }[])[0];
  if (!row) {
    res.status(400).json({ error: "TOKEN_INVALID" });
    return;
  }
  if (new Date() > new Date(row.expires_at)) {
    await pool.query("DELETE FROM password_reset_tokens WHERE token = ?", [token]);
    res.status(400).json({ error: "TOKEN_EXPIRED" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, row.user_id]);
  await pool.query("DELETE FROM password_reset_tokens WHERE token = ?", [token]);

  res.json({ ok: true });
}
