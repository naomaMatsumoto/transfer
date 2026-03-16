/**
 * メール送信 (Mailgun)
 * 必要な環境変数:
 *   MAILGUN_API_KEY   — Mailgun の API キー
 *   MAILGUN_DOMAIN    — 送信ドメイン (例: mg.example.com)
 *   MAILGUN_API_URL   — (任意) EU リージョンの場合 https://api.eu.mailgun.net
 *   MAIL_FROM         — (任意) 送信元アドレス (既定: support@dynamo-b-studio.com)
 *   FRONTEND_BASE_URL — 認証リンクのベース URL
 * 未設定時はログに URL を出力してメールは送信しない（開発用）
 */
import Mailgun from "mailgun.js";
import FormData from "form-data";
import logger from "./logger";

const MAIL_FROM = process.env.MAIL_FROM || "support@dynamo-b-studio.com";
const FRONTEND_BASE = (process.env.FRONTEND_BASE_URL || process.env.CORS_ORIGIN || "http://localhost:3000").replace(
  /\/$/,
  "",
);

function getClient(): { mg: ReturnType<InstanceType<typeof Mailgun>["client"]>; domain: string } | null {
  const apiKey = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!apiKey || !domain) return null;
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: apiKey,
    url: process.env.MAILGUN_API_URL || "https://api.mailgun.net",
  });
  return { mg, domain };
}

async function send(to: string, subject: string, text: string, html: string): Promise<boolean> {
  const client = getClient();
  if (!client) {
    logger.warn("Mailgun not configured (MAILGUN_API_KEY / MAILGUN_DOMAIN unset). Email not sent.");
    return false;
  }
  try {
    await client.mg.messages.create(client.domain, {
      from: MAIL_FROM,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (e) {
    logger.error("Failed to send email: " + (e instanceof Error ? e.message : String(e)));
    return false;
  }
}

/**
 * 会員登録メール認証用のメールを送信する
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const verifyUrl = `${FRONTEND_BASE}/register/verify?token=${encodeURIComponent(token)}`;
  logger.info(`Sending verification email to ${to}`);
  return send(
    to,
    "【会員登録】メールアドレスの認証",
    `会員登録を受け付けました。以下のリンクをクリックして、メールアドレスを認証してください。\n\n${verifyUrl}\n\nこのリンクは24時間有効です。\n\n※心当たりがない場合はこのメールを無視してください。`,
    `
      <p>会員登録を受け付けました。</p>
      <p>以下のリンクをクリックして、メールアドレスを認証してください。</p>
      <p><a href="${verifyUrl}">${verifyUrl}</a></p>
      <p>このリンクは24時間有効です。</p>
      <p>※心当たりがない場合はこのメールを無視してください。</p>
    `.trim(),
  );
}

/**
 * パスワード再設定用メールを送信する
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  logger.info(`Sending password reset email to ${to}`);
  return send(
    to,
    "【パスワード再設定】",
    `パスワード再設定のリクエストを受け付けました。以下のリンクをクリックして、新しいパスワードを設定してください。\n\n${resetUrl}\n\nこのリンクは1時間で無効になります。\n\n※心当たりがない場合はこのメールを無視してください。`,
    `
      <p>パスワード再設定のリクエストを受け付けました。</p>
      <p>以下のリンクをクリックして、新しいパスワードを設定してください。</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>このリンクは1時間で無効になります。</p>
      <p>※心当たりがない場合はこのメールを無視してください。</p>
    `.trim(),
  );
}
