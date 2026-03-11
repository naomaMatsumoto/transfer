import "express-session";

declare module "express-session" {
  interface SessionData {
    account?: { accountId: number; corporationId: number; email: string; role?: "admin" | "staff" };
    /** 運営管理者ログイン時 */
    platformAdmin?: { id: number; email: string };
    /** 会員（カレンダー・振替用）メール認証完了時に設定 */
    memberId?: number;
  }
}
