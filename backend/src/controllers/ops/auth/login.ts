import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { badRequest, unauthorized, serverError, ok } from "../../../lib/respond";

export default async function opsLogin(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { email?: string; password?: string };
  const { email, password } = body;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    badRequest(res, "EMAIL_PASSWORD_REQUIRED");
    return;
  }
  const [rows] = await pool.query(
    "SELECT id, email, password_hash, display_name FROM platform_admins WHERE email = ? LIMIT 1",
    [email.trim().toLowerCase()]
  );
  const admin = (rows as { id: number; email: string; password_hash: string; display_name: string | null }[])[0];
  if (!admin) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }
  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    unauthorized(res, "INVALID_EMAIL_OR_PASSWORD");
    return;
  }
  if (!req.session) {
    serverError(res, "SESSION_NOT_AVAILABLE");
    return;
  }
  req.session.platformAdmin = { id: admin.id, email: admin.email };
  ok(res, {
    id: admin.id,
    email: admin.email,
    displayName: admin.display_name,
  });
}
