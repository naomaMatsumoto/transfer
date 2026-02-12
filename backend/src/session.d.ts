import "express-session";

declare module "express-session" {
  interface SessionData {
    account?: { accountId: number; corporationId: number; email: string };
    /** 運営管理者ログイン時 */
    platformAdmin?: { id: number; email: string };
  }
}
