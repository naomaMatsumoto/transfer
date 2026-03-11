import { type Request, type Response, type NextFunction } from "express";

export default async function membersMe(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  res.json({ id: memberId });
}
