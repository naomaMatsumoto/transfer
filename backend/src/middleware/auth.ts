import { type Request, type Response, type NextFunction } from "express";

/**
 * 法人管理画面用。ログイン必須。未ログインなら 401 を返す。
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.account) {
    next();
    return;
  }
  res.status(401).json({ error: "UNAUTHORIZED" });
}

/**
 * 管理者ロール限定。スタッフは 403。
 */
export function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.account) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  if (req.session.account.role === "staff") {
    res.status(403).json({ error: "FORBIDDEN", message: "管理者権限が必要です" });
    return;
  }
  next();
}

/**
 * 運営管理画面用。プラットフォーム管理者ログイン必須。
 */
export function requirePlatformAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.platformAdmin) {
    next();
    return;
  }
  res.status(401).json({ error: "UNAUTHORIZED" });
}
