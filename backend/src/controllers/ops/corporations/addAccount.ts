import bcrypt from "bcrypt";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId, opsAudit } from "../../../lib/opsHelpers";

export default async function addAccount(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const { email: rawEmail, password, role: rawRole } = req.body as {
    email?: string; password?: string; role?: string;
  };
  const email = String(rawEmail ?? "").trim();
  const role = rawRole === "staff" ? "staff" : "admin";

  if (!email || !password) {
    res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
    return;
  }

  const [dup] = await pool.query(
    "SELECT id FROM accounts WHERE corporation_id = ? AND email = ?",
    [corp.id, email]
  );
  if ((dup as unknown[]).length > 0) {
    res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO accounts (corporation_id, email, password, role) VALUES (?, ?, ?, ?)",
    [corp.id, email, hashed, role]
  );
  const id = getInsertId(result);
  await opsAudit(req, "account.create", "account", id, { email, role });
  res.status(201).json({ id, email, role });
}
