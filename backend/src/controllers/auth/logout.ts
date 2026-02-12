import { Request, Response, NextFunction } from "express";

export default async function logout(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  req.session = undefined;
  res.json({ ok: true });
}
