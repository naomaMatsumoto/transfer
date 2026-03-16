import { type Request, type Response, type NextFunction } from "express";
import { unauthorized, ok } from "../../lib/respond";

export default async function membersMe(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const memberId = req.session?.memberId;
  if (memberId == null || typeof memberId !== "number") {
    unauthorized(res);
    return;
  }
  ok(res, { id: memberId });
}
