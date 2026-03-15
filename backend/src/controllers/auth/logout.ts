import { type Request, type Response, type NextFunction } from "express";
import { ok } from "../../lib/respond";

export default async function logout(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  req.session.destroy(() => {
    ok(res, { ok: true });
  });
}
