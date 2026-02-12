"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = registerCorporation;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../../db");
const constants_1 = require("../../constants");
async function registerCorporation(req, res, _next) {
    const body = req.body;
    const { corporationName, storeName, adminEmail, adminPassword, adminDisplayName, } = body;
    const corpName = corporationName?.trim();
    const sName = storeName?.trim();
    const email = adminEmail?.trim().toLowerCase();
    const password = adminPassword;
    if (!corpName) {
        res.status(400).json({ error: constants_1.ERR.CORPORATION_NAME_REQUIRED });
        return;
    }
    if (!sName) {
        res.status(400).json({ error: constants_1.ERR.STORE_NAME_REQUIRED });
        return;
    }
    if (!email) {
        res.status(400).json({ error: constants_1.ERR.ADMIN_EMAIL_REQUIRED });
        return;
    }
    if (!(0, constants_1.isValidEmail)(email)) {
        res.status(400).json({ error: constants_1.ERR.MEMBER_EMAIL_INVALID });
        return;
    }
    if (!password || String(password).length < 6) {
        res.status(400).json({ error: constants_1.ERR.ADMIN_PASSWORD_REQUIRED });
        return;
    }
    const [existing] = await db_1.pool.query("SELECT id FROM accounts WHERE email = ? LIMIT 1", [email]);
    if (existing.length > 0) {
        res.status(400).json({ error: constants_1.ERR.ADMIN_EMAIL_ALREADY_USED });
        return;
    }
    const conn = await db_1.pool.getConnection();
    try {
        await conn.beginTransaction();
        const [corpResult] = await conn.query("INSERT INTO corporations (name) VALUES (?)", [corpName]);
        const corporationId = corpResult.insertId;
        await conn.query("INSERT INTO stores (corporation_id, name) VALUES (?, ?)", [corporationId, sName]);
        const hash = await bcrypt_1.default.hash(String(password), 10);
        await conn.query("INSERT INTO accounts (corporation_id, email, password_hash, display_name) VALUES (?, ?, ?, ?)", [corporationId, email, hash, (adminDisplayName ?? "").trim() || null]);
        await conn.commit();
        res.status(201).json({
            corporationId,
            message: "法人を登録しました。ログイン画面からログインしてください。",
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
