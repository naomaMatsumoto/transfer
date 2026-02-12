"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendVerificationEmail = sendVerificationEmail;
/**
 * 会員登録メール認証の送信
 * 送信元: MAIL_FROM（既定: support@dynamo-b-studio.com）
 * 必要な環境変数（本番）: SMTP_HOST, SMTP_USER, SMTP_PASS, FRONTEND_BASE_URL（認証リンクのベースURL）
 * 未設定時はログに認証URLを出力し、メールは送信しない（開発用）
 */
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("./logger"));
const MAIL_FROM = process.env.MAIL_FROM || "support@dynamo-b-studio.com";
const FRONTEND_BASE = (process.env.FRONTEND_BASE_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(/\/$/, "");
function getTransport() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) {
        return null;
    }
    return nodemailer_1.default.createTransport({
        host,
        port: port ? Number(port) : 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: { user, pass },
    });
}
/**
 * 会員登録メール認証用のメールを送信する
 */
async function sendVerificationEmail(to, token) {
    const verifyUrl = `${FRONTEND_BASE.replace(/\/$/, "")}/register/verify?token=${encodeURIComponent(token)}`;
    const transport = getTransport();
    if (!transport) {
        logger_1.default.warn("SMTP not configured. Verification email not sent. Link: " + verifyUrl);
        return false;
    }
    try {
        await transport.sendMail({
            from: MAIL_FROM,
            to,
            subject: "【会員登録】メールアドレスの認証",
            text: `会員登録を受け付けました。以下のリンクをクリックして、メールアドレスを認証してください。\n\n${verifyUrl}\n\nこのリンクは24時間有効です。\n\n※心当たりがない場合はこのメールを無視してください。`,
            html: `
        <p>会員登録を受け付けました。</p>
        <p>以下のリンクをクリックして、メールアドレスを認証してください。</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>このリンクは24時間有効です。</p>
        <p>※心当たりがない場合はこのメールを無視してください。</p>
      `.trim(),
        });
        logger_1.default.info("Verification email sent to " + to);
        return true;
    }
    catch (e) {
        logger_1.default.error("Failed to send verification email: " + (e instanceof Error ? e.message : String(e)));
        return false;
    }
}
