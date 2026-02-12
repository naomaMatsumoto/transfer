"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerMember;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("../../db");
const constants_1 = require("../../constants");
const mailer_1 = require("../../mailer");
async function registerMember(req, res, _next) {
    const body = req.body;
    const { storeId, name, furigana, email, phone } = body;
    const trimmedName = name?.trim();
    if (!trimmedName) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_NAME_REQUIRED });
        return;
    }
    if (!storeId || !Number.isInteger(storeId) || storeId < 1) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_STORE_REQUIRED });
        return;
    }
    const emailVal = email?.trim() || null;
    if (!emailVal) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_REQUIRED });
        return;
    }
    if (!(0, constants_1.isValidEmail)(emailVal)) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_INVALID });
        return;
    }
    const [dup] = await db_1.pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [emailVal]);
    if (dup.length > 0) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_DUPLICATE });
        return;
    }
    const [storeRows] = await db_1.pool.query("SELECT id FROM stores WHERE id = ? LIMIT 1", [storeId]);
    if (storeRows.length === 0) {
        res.status(400).json({ error: constants_1.ERR.STORE_NOT_FOUND });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [result] = await conn.query("INSERT INTO users (store_id, name, furigana, email, email_verified_at, phone, status) VALUES (?, ?, ?, ?, NULL, ?, 'active')", [
            storeId,
            trimmedName,
            (furigana ?? "").trim() || null,
            emailVal,
            (phone ?? "").trim() || null,
        ]);
        const userId = result.insertId;
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await conn.query("INSERT INTO verification_tokens (user_id, token, expires_at) VALUES (?, ?, ?)", [userId, token, expiresAt]);
        await conn.commit();
        await (0, mailer_1.sendVerificationEmail)(emailVal, token);
        res.status(201).json({
            id: userId,
            storeId,
            message: "登録を受け付けました。ご登録のメールアドレスに認証リンクをお送りしました。メール内のリンクをクリックして登録を完了してください。",
        });
    }
    catch (e) {
        await conn.rollback();
        throw e;
    }
    finally {
        conn.release();
    }
}
