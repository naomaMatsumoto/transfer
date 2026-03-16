import { type Request, type Response, type NextFunction } from "express";
import { unauthorized, ok } from "../../../lib/respond";

export default async function opsMe(req: Request, res: Response, _next: NextFunction): Promise<void> {
  if (!req.session?.platformAdmin) {
    unauthorized(res);
    return;
  }
  ok(res, {
    id: req.session.platformAdmin.id,
    email: req.session.platformAdmin.email,
  });
}
