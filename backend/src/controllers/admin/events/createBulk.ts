import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIds } from "../../../lib/corporationStores";
import { forbidden, badRequest, notFound, created } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { syncEventStaff } from "../../../services/eventStaff";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function createBulkEvents(
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
    startTime?: string;
    endTime?: string;
    capacity?: number;
    weekdays?: number[];
    dateFrom?: string;
    dateTo?: string;
    excludeDates?: string[];
    staffIds?: number[];
  };
  const { classTypeId, startTime, endTime, capacity, weekdays, dateFrom, dateTo, excludeDates, staffIds } = body;

  if (
    !classTypeId ||
    !startTime ||
    !endTime ||
    !weekdays ||
    weekdays.length === 0 ||
    !dateFrom ||
    !dateTo
  ) {
    badRequest(res, ERR.EVENT_BULK_PARAMS_REQUIRED);
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

  const excludeSet = new Set(excludeDates ?? []);
  const createdEvents: { id: number; date: string }[] = [];

  const cursor = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");

  while (cursor <= end) {
    const day = cursor.getDay();
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (weekdays.includes(day) && !excludeSet.has(dateStr)) {
      const startsAt = `${dateStr} ${startTime}:00`;
      const endsAt = `${dateStr} ${endTime}:00`;

      const [result] = await pool.query(
        `INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status)
         VALUES (?, ?, ?, ?, 'scheduled')`,
        [classTypeId, startsAt, endsAt, capacity ?? 6]
      );
      const eventId = (result as { insertId: number }).insertId;
      createdEvents.push({ id: eventId, date: dateStr });

      await syncEventStaff(pool, eventId, staffIds ?? [], storeIds);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  await writeAuditLog({
    actorType: "admin",
    actorId: req.session?.account?.accountId ?? null,
    action: "event.create_bulk",
    targetType: "event",
    targetId: null,
    detail: { classTypeId, count: createdEvents.length },
  });

  created(res, { count: createdEvents.length, events: createdEvents });
}
