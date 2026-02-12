"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = verifyMember;
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function verifyMember(req, res, _next) {
    const token = req.query.token?.trim();
    if (!token) {
        res.status(400).json({ error: constants_1.ERR.VERIFICATION_TOKEN_INVALID });
        return;
    }
    const [rows] = await db_1.pool.query("SELECT vt.user_id, vt.expires_at FROM verification_tokens vt WHERE vt.token = ? LIMIT 1", [token]);
    const row = rows[0];
    if (!row) {
        res.status(400).json({ error: constants_1.ERR.VERIFICATION_TOKEN_INVALID });
        return;
    }
    if (new Date() > new Date(row.expires_at)) {
        await db_1.pool.query("DELETE FROM verification_tokens WHERE token = ?", [token]);
        res.status(400).json({ error: constants_1.ERR.VERIFICATION_TOKEN_EXPIRED });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.query("UPDATE users SET email_verified_at = NOW() WHERE id = ?", [row.user_id]);
        await conn.query("DELETE FROM verification_tokens WHERE token = ?", [token]);
        await conn.commit();
    }
    catch (e) {
        await conn.rollback();
        throw e;
    }
    finally {
        conn.release();
    }
    res.json({
        message: "メールアドレスの認証が完了しました。会員登録が完了しました。",
    });
}
