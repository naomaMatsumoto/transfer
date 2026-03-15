import { type Request, type Response, type NextFunction } from "express";
import type { Session, SessionData } from "express-session";
import { ok } from "../../lib/respond";

export default async function membersLogout(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const session = (req as unknown as { session?: Session & Partial<SessionData> }).session;
  if (session?.memberId != null) {
    session.memberId = undefined;
  }
  ok(res, { ok: true });
}
