import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../db";
import { ERR, isValidEmail } from "../../constants";
import { badRequest, created } from "../../lib/respond";

export default async function registerCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as {
    organizationType?: "corporation" | "sole_proprietor";
    corporationName?: string;
    storeName?: string;
    adminEmail?: string;
    adminPassword?: string;
    adminDisplayName?: string;
  };
  const {
    organizationType,
    corporationName,
    storeName,
    adminEmail,
    adminPassword,
    adminDisplayName,
  } = body;

  const orgType = organizationType === "sole_proprietor" ? "sole_proprietor" : "corporation";

  const corpName = corporationName?.trim();
  const sName = storeName?.trim();
  const email = adminEmail?.trim().toLowerCase();
  const password = adminPassword;

  if (!corpName) {
    badRequest(res, ERR.CORPORATION_NAME_REQUIRED);
    return;
  }
  if (!sName) {
    badRequest(res, ERR.STORE_NAME_REQUIRED);
    return;
  }
  if (!email) {
    badRequest(res, ERR.ADMIN_EMAIL_REQUIRED);
    return;
  }
  if (!isValidEmail(email)) {
    badRequest(res, ERR.MEMBER_EMAIL_INVALID);
    return;
  }
  if (!password || String(password).length < 6) {
    badRequest(res, ERR.ADMIN_PASSWORD_REQUIRED);
    return;
  }

  const [existing] = await pool.query(
    "SELECT id FROM accounts WHERE email = ? LIMIT 1",
    [email]
  );
  if ((existing as unknown[]).length > 0) {
    badRequest(res, ERR.ADMIN_EMAIL_ALREADY_USED);
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [corpResult] = await conn.query(
      "INSERT INTO corporations (organization_type, name) VALUES (?, ?)",
      [orgType, corpName]
    );
    const corporationId = (corpResult as { insertId: number }).insertId;
    await conn.query(
      "INSERT INTO stores (corporation_id, name) VALUES (?, ?)",
      [corporationId, sName]
    );
    const hash = await bcrypt.hash(String(password), 10);
    await conn.query(
      "INSERT INTO accounts (corporation_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)",
      [corporationId, email, hash, (adminDisplayName ?? "").trim() || null]
    );
    await conn.commit();
    created(res, {
      corporationId,
      message: orgType === "sole_proprietor" ? "個人事業主として登録しました。ログイン画面からログインしてください。" : "法人を登録しました。ログイン画面からログインしてください。",
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
