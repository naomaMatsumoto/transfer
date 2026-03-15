import { type Request, type Response, type NextFunction } from "express";
import { unauthorized, ok } from "../../lib/respond";

export default async function me(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (!req.session?.account) {
    unauthorized(res);
    return;
  }
  ok(res, {
    accountId: req.session.account.accountId,
    corporationId: req.session.account.corporationId,
    email: req.session.account.email,
  });
}
