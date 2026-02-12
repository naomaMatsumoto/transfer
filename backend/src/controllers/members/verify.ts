import { Request, Response, NextFunction } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";

export default async function verifyMember(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const token = (req.query.token as string)?.trim();
  if (!token) {
    res.status(400).json({ error: ERR.VERIFICATION_TOKEN_INVALID });
    return;
  }

  const [rows] = await pool.query(
    "SELECT vt.user_id, vt.expires_at FROM verification_tokens vt WHERE vt.token = ? LIMIT 1",
    [token]
  );
  const row = (rows as { user_id: number; expires_at: Date }[])[0];
  if (!row) {
    res.status(400).json({ error: ERR.VERIFICATION_TOKEN_INVALID });
    return;
  }
  if (new Date() > new Date(row.expires_at)) {
    await pool.query("DELETE FROM verification_tokens WHERE token = ?", [token]);
    res.status(400).json({ error: ERR.VERIFICATION_TOKEN_EXPIRED });
    return;
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      "UPDATE users SET email_verified_at = NOW() WHERE id = ?",
      [row.user_id]
    );
    await conn.query("DELETE FROM verification_tokens WHERE token = ?", [token]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  res.json({
    message: "メールアドレスの認証が完了しました。会員登録が完了しました。",
  });
}
