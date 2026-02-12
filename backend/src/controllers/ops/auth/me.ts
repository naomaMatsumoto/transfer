import { Request, Response, NextFunction } from "express";

export default async function opsMe(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  if (!req.session?.platformAdmin) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  res.json({
    id: req.session.platformAdmin.id,
    email: req.session.platformAdmin.email,
  });
}
