import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";
import { unauthorized, badRequest, ok } from "../../lib/respond";

export default async function membersUpdatePassword(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    unauthorized(res);
    return;
  }
  const body = req.body as { currentPassword?: string; newPassword?: string };
  const currentPassword = body.currentPassword != null ? String(body.currentPassword) : "";
  const newPassword = body.newPassword != null ? String(body.newPassword) : "";
  if (!currentPassword || !newPassword) {
    badRequest(res, "CURRENT_AND_NEW_PASSWORD_REQUIRED");
    return;
  }
  if (newPassword.length < 6) {
    badRequest(res, "NEW_PASSWORD_TOO_SHORT");
    return;
  }

  const [rows] = await pool.query(
    "SELECT id, password_hash FROM users WHERE id = ? AND status = 'active' LIMIT 1",
    [memberId]
  );
  const user = (rows as { id: number; password_hash: string | null }[])[0];
  if (!user || !user.password_hash) {
    unauthorized(res);
    return;
  }
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) {
    badRequest(res, "CURRENT_PASSWORD_INVALID");
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await pool.query("UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?", [hash, memberId]);
  ok(res, { ok: true });
}
