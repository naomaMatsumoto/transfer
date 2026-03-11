import { type Request, type Response, type NextFunction } from "express";

export default async function logout(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
}
