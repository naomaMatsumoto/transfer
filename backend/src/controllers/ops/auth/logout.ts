import { type Request, type Response, type NextFunction } from "express";

export default async function opsLogout(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (req.session) {
    delete req.session.platformAdmin;
  }
  res.json({ ok: true });
}
