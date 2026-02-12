"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = login;
const bcrypt_1 = __importDefault(require("bcrypt"));
const db_1 = require("../../db");
async function login(req, res, _next) {
    const body = req.body;
    const { email, password } = body;
    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
        res.status(400).json({ error: "EMAIL_PASSWORD_REQUIRED" });
        return;
    }
    const [rows] = await db_1.pool.query("SELECT id, corporation_id, email, password_hash, display_name FROM accounts WHERE email = ? LIMIT 1", [email.trim().toLowerCase()]);
    const account = rows[0];
    if (!account) {
        res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
        return;
    }
    const match = await bcrypt_1.default.compare(password, account.password_hash);
    if (!match) {
        res.status(401).json({ error: "INVALID_EMAIL_OR_PASSWORD" });
        return;
    }
    if (!req.session) {
        res.status(500).json({ error: "SESSION_NOT_AVAILABLE" });
        return;
    }
    req.session.account = {
        accountId: account.id,
        corporationId: account.corporation_id,
        email: account.email,
    };
    res.json({
        accountId: account.id,
        corporationId: account.corporation_id,
        email: account.email,
        displayName: account.display_name,
    });
}
