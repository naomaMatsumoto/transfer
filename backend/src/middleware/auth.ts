import { Request, Response, NextFunction } from "express";

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
 * 運営管理画面用。プラットフォーム管理者ログイン必須。
 */
export function requirePlatformAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.platformAdmin) {
    next();
    return;
  }
  res.status(401).json({ error: "UNAUTHORIZED" });
}
