import crypto from "crypto";
import bcrypt from "bcrypt";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId } from "../../../lib/opsHelpers";
import { badRequest, conflict, created } from "../../../lib/respond";

export default async function createCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as {
    name?: string;
    organizationType?: string;
    email?: string;
    displayName?: string;
    password?: string;
  };
  const name = String(body.name ?? "").trim();
  if (!name) {
    badRequest(res, "NAME_REQUIRED");
    return;
  }

  const email = body.email != null ? String(body.email).trim().toLowerCase() : "";
  const displayName = body.displayName != null ? String(body.displayName).trim() || null : null;
  const password = body.password != null ? String(body.password) : "";
  const withAccount = email.length > 0 && password.length > 0;

  if (withAccount && password.length < 6) {
    badRequest(res, "PASSWORD_TOO_SHORT");
    return;
  }

  const orgType = body.organizationType === "sole_proprietor" ? "sole_proprietor" : "corporation";
  const code = crypto.randomBytes(9).toString("base64url").slice(0, 12);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      "INSERT INTO corporations (code, organization_type, name) VALUES (?, ?, ?)",
      [code, orgType, name]
    );
    const corpId = getInsertId(result);

    if (withAccount) {
      const [dup] = await conn.query("SELECT id FROM accounts WHERE email = ?", [email]);
      if ((dup as unknown[]).length > 0) {
        await conn.rollback();
        conflict(res, "EMAIL_ALREADY_EXISTS");
        return;
      }
      const hashed = await bcrypt.hash(password, 10);
      await conn.query(
        "INSERT INTO accounts (corporation_id, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, 'admin')",
        [corpId, email, hashed, displayName]
      );
    }

    await conn.commit();
    created(res, {
      id: corpId,
      code,
      organization_type: orgType,
      name,
      accountCreated: withAccount,
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
