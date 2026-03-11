/**
 * 会員登録メール認証の送信
 * 送信元: MAIL_FROM（既定: support@dynamo-b-studio.com）
 * 必要な環境変数（本番）: SMTP_HOST, SMTP_USER, SMTP_PASS, FRONTEND_BASE_URL（認証リンクのベースURL）
 * 未設定時はログに認証URLを出力し、メールは送信しない（開発用）
 */
import nodemailer from "nodemailer";
import logger from "./logger";

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
  return nodemailer.createTransport({
    host,
    port: port ? Number(port) : 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

/**
 * 会員登録メール認証用のメールを送信する
 */
export async function sendVerificationEmail(to: string, token: string): Promise<boolean> {
  const verifyUrl = `${FRONTEND_BASE.replace(/\/$/, "")}/register/verify?token=${encodeURIComponent(token)}`;
  const transport = getTransport();
  if (!transport) {
    logger.warn("SMTP not configured. Verification email not sent. (Set SMTP_* env for production)");
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
    logger.info("Verification email sent");
    return true;
  } catch (e) {
    logger.error("Failed to send verification email: " + (e instanceof Error ? e.message : String(e)));
    return false;
  }
}

/**
 * パスワード再設定用メールを送信する
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    logger.warn("SMTP not configured. Password reset email not sent. (Set SMTP_* env for production)");
    return false;
  }
  try {
    await transport.sendMail({
      from: MAIL_FROM,
      to,
      subject: "【パスワード再設定】",
      text: `パスワード再設定のリクエストを受け付けました。以下のリンクをクリックして、新しいパスワードを設定してください。\n\n${resetUrl}\n\nこのリンクは1時間で無効になります。\n\n※心当たりがない場合はこのメールを無視してください。`,
      html: `
        <p>パスワード再設定のリクエストを受け付けました。</p>
        <p>以下のリンクをクリックして、新しいパスワードを設定してください。</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>このリンクは1時間で無効になります。</p>
        <p>※心当たりがない場合はこのメールを無視してください。</p>
      `.trim(),
    });
    logger.info("Password reset email sent");
    return true;
  } catch (e) {
    logger.error("Failed to send password reset email: " + (e instanceof Error ? e.message : String(e)));
    return false;
  }
}
