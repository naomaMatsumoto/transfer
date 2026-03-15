import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function bulkTimeEvents(
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
    ids?: number[];
    startTime?: string;
    endTime?: string;
  };
  const { ids, startTime, endTime } = body;
  if (!ids || ids.length === 0 || !startTime || !endTime) {
    badRequest(res, ERR.EVENT_BULK_TIME_PARAMS_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const idsPh = ph(ids);
  const [fetchRows] = await pool.query(
    `SELECT e.id, e.starts_at FROM events e
     JOIN class_types ct ON ct.id = e.class_type_id
     WHERE e.id IN (${idsPh}) AND ct.store_id IN (${storePh})`,
    [...ids, ...storeIds]
  );
  const validRows = (fetchRows as { id: number; starts_at: string }[]).filter((r) => {
    const d = (r.starts_at ?? "").toString().slice(0, 10);
    return d.length >= 10;
  });
  let updated = 0;
  if (validRows.length > 0) {
    const whenClauses = validRows.map(() => "WHEN ? THEN ?").join(" ");
    const startParams: unknown[] = [];
    const endParams: unknown[] = [];
    for (const r of validRows) {
      const dateStr = r.starts_at.toString().slice(0, 10);
      startParams.push(r.id, `${dateStr} ${startTime}:00`);
      endParams.push(r.id, `${dateStr} ${endTime}:00`);
    }
    const validIdsPh = ph(validRows);
    await pool.query(
      `UPDATE events SET
         starts_at = CASE id ${whenClauses} END,
         ends_at   = CASE id ${whenClauses} END,
         updated_at = NOW()
       WHERE id IN (${validIdsPh})`,
      [...startParams, ...endParams, ...validRows.map((r) => r.id)]
    );
    updated = validRows.length;
  }
  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.bulk_time",
    targetType: "event",
    targetId: null,
    detail: { ids, startTime, endTime },
  });
  ok(res, { updated, startTime, endTime });
}
