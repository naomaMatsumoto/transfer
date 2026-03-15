import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, created } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { syncEventStaff } from "../../../services/eventStaff";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function createEvent(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIds(req);
  if (storeIds.length === 0) {
    forbidden(res);
    return;
  }
  const body = req.body as {
    classTypeId?: number;
    startsAt?: string;
    endsAt?: string;
    capacity?: number;
    staffIds?: number[];
  };
  const { classTypeId, startsAt, endsAt, capacity, staffIds } = body;
  if (!classTypeId || !startsAt || !endsAt) {
    badRequest(res, ERR.EVENT_CREATE_PARAMS_REQUIRED);
    return;
  }
  const placeholders = ph(storeIds);
  const [ctRows] = await pool.query(
    `SELECT id FROM class_types WHERE id = ? AND store_id IN (${placeholders})`,
    [classTypeId, ...storeIds]
  );
  if ((ctRows as unknown[]).length === 0) {
    notFound(res, ERR.CLASS_TYPE_NOT_FOUND);
    return;
  }
  const sql = "INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES (?, ?, ?, ?, 'scheduled')";
  const [result] = await pool.query(sql, [classTypeId, startsAt, endsAt, capacity ?? 6]);
  const insertId = (result as { insertId: number }).insertId;

  await syncEventStaff(pool, insertId, staffIds ?? [], storeIds);

  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.create",
    targetType: "event",
    targetId: insertId,
    detail: { classTypeId, startsAt },
  });

  created(res, { id: insertId });
}
