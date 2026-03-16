import { type Request, type Response, type NextFunction } from "express";
import crypto from "crypto";
import { pool } from "../../db";
import { ERR, isValidEmail } from "../../constants";
import { sendVerificationEmail } from "../../mailer";
import { badRequest, created } from "../../lib/respond";

export default async function registerMember(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const body = req.body as {
    storeId?: number;
    name?: string;
    furigana?: string;
    email?: string;
    phone?: string;
  };
  const { storeId, name, furigana, email, phone } = body;

  const trimmedName = name?.trim();
  if (!trimmedName) {
    badRequest(res, ERR.MEMBER_NAME_REQUIRED);
    return;
  }
  if (!storeId || !Number.isInteger(storeId) || storeId < 1) {
    badRequest(res, ERR.MEMBER_STORE_REQUIRED);
    return;
  }

  const emailVal = email?.trim() || null;
  if (!emailVal) {
    badRequest(res, ERR.MEMBER_EMAIL_REQUIRED);
    return;
  }
  if (!isValidEmail(emailVal)) {
    badRequest(res, ERR.MEMBER_EMAIL_INVALID);
    return;
  }
  const [dup] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [emailVal]);
  if ((dup as unknown[]).length > 0) {
    badRequest(res, ERR.MEMBER_EMAIL_DUPLICATE);
    return;
  }

  const [storeRows] = await pool.query("SELECT id FROM stores WHERE id = ? LIMIT 1", [storeId]);
  if ((storeRows as unknown[]).length === 0) {
    badRequest(res, ERR.STORE_NOT_FOUND);
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      "INSERT INTO users (store_id, name, furigana, email, email_verified_at, phone, status) VALUES (?, ?, ?, ?, NULL, ?, 'active')",
      [storeId, trimmedName, (furigana ?? "").trim() || null, emailVal, (phone ?? "").trim() || null],
    );
    const userId = (result as { insertId: number }).insertId;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await conn.query("INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [
      userId,
      token,
      expiresAt,
    ]);
    await conn.commit();

    await sendVerificationEmail(emailVal, token);

    created(res, {
      id: userId,
      storeId,
      message:
        "登録を受け付けました。ご登録のメールアドレスに認証リンクをお送りしました。メール内のリンクをクリックして登録を完了してください。",
    });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
