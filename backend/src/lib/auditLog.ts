import { pool } from "../db";

export type ActorType = "admin" | "member" | "platform" | "system";

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
      ]
    );
  } catch {
    // ログ書き込みの失敗で本体処理を止めない
  }
}
