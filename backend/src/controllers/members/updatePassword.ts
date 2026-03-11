import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";

export default async function membersUpdatePassword(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  const body = req.body as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword != null ? String(body.currentPassword) : "";
  const newPassword = body.newPassword != null ? String(body.newPassword) : "";
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "CURRENT_AND_NEW_PASSWORD_REQUIRED" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "NEW_PASSWORD_TOO_SHORT" });
    return;
  }

  const [rows] = await pool.query(
    "SELECT id, password_hash FROM users WHERE id = ? AND status = 'active' LIMIT 1",
    [memberId]
  );
  const user = (rows as { id: number; password_hash: string | null }[])[0];
  if (!user || !user.password_hash) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) {
    res.status(400).json({ error: "CURRENT_PASSWORD_INVALID" });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, memberId]);
  res.json({ ok: true });
}
