import { type Request, type Response } from "express";

/**
 * 会員セッションから memberId を取得する。
 * 未ログインの場合は 401 を返して null を返す。
 * 呼び出し元は null の場合に即 return すること。
 */
export function getMemberId(req: Request, res: Response): number | null {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return null;
  }
  return memberId;
}

/**
 * ログイン成功後にセッション ID を再発行する（Session Fixation 対策）。
 * 既存のセッションデータを引き継いだまま新しいセッション ID を発行する。
 */
export async function regenerateSession(req: Request): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
