import { type Request } from "express";
import { pool } from "../db";
import logger from "../logger";

export type ActorType = "admin" | "member" | "platform" | "system";

/** 管理者リクエストから actorId を取得する */
export function adminActorId(req: Request): number | null {
  return req.session?.account?.accountId ?? null;
}

export async function writeAuditLog(params: {
  actorType: ActorType;
  actorId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  detail?: Record<string, unknown> | null;
}): Promise<void> {
  try {
    await pool.query(
      "INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?)",
      [
        params.actorType,
        params.actorId ?? null,
        params.action,
        params.targetType ?? null,
        params.targetId ?? null,
        params.detail ? JSON.stringify(params.detail) : null,
      ],
    );
  } catch (e) {
    logger.error("audit log write failed: " + (e instanceof Error ? e.message : String(e)));
  }
}
