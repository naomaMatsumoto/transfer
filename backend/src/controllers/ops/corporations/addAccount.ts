import bcrypt from "bcrypt";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId, opsAudit } from "../../../lib/opsHelpers";
import { badRequest, conflict, created } from "../../../lib/respond";

export default async function addAccount(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corp = req.corporation!;
  const {
    email: rawEmail,
    password,
    role: rawRole,
  } = req.body as {
    email?: string;
    password?: string;
    role?: string;
  };
  const email = String(rawEmail ?? "")
    .trim()
    .toLowerCase();
  const role = rawRole === "staff" ? "staff" : "admin";

  if (!email || !password) {
    badRequest(res, "EMAIL_PASSWORD_REQUIRED");
    return;
  }

  const [dup] = await pool.query("SELECT id FROM accounts WHERE email = ?", [email]);
  if ((dup as unknown[]).length > 0) {
    conflict(res, "EMAIL_ALREADY_EXISTS");
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO accounts (corporation_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
    [corp.id, email.toLowerCase(), hashed, (req.body as { displayName?: string }).displayName?.trim() || null, role],
  );
  const id = getInsertId(result);
  await opsAudit(req, "account.create", "account", id, { email, role });
  created(res, { id, email, role });
}
