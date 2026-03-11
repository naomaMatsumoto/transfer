import { type Request, type Response, type NextFunction } from "express";

export default async function me(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (!req.session?.account) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  res.json({
    accountId: req.session.account.accountId,
    corporationId: req.session.account.corporationId,
    email: req.session.account.email,
  });
}
