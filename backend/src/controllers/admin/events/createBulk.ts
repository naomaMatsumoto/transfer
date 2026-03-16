import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, created } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function createBulkEvents(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
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

  if (!classTypeId || !startTime || !endTime || !weekdays || weekdays.length === 0 || !dateFrom || !dateTo) {
    badRequest(res, ERR.EVENT_BULK_PARAMS_REQUIRED);
    return;
  }

  const placeholders = ph(storeIds);
  const [ctRows] = await pool.query(`SELECT id FROM class_types WHERE id = ? AND store_id IN (${placeholders})`, [
    classTypeId,
    ...storeIds,
  ]);
  if ((ctRows as unknown[]).length === 0) {
    notFound(res, ERR.CLASS_TYPE_NOT_FOUND);
    return;
  }

  // 対象日付を先にすべて収集（DBアクセスなし）
  const excludeSet = new Set(excludeDates ?? []);
  const eventRows: [string, string, string][] = []; // [dateStr, startsAt, endsAt]

  const cursor = new Date(dateFrom + "T00:00:00");
  const end = new Date(dateTo + "T00:00:00");

  while (cursor <= end) {
    const day = cursor.getDay();
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const dateStr = `${y}-${m}-${d}`;

    if (weekdays.includes(day) && !excludeSet.has(dateStr)) {
      eventRows.push([dateStr, `${dateStr} ${startTime}:00`, `${dateStr} ${endTime}:00`]);
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  if (eventRows.length === 0) {
    created(res, { count: 0, events: [] });
    return;
  }

  const cap = capacity ?? 6;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // events を一括 INSERT
    const eventPlaceholders = eventRows.map(() => "(?, ?, ?, ?, 'scheduled')").join(", ");
    const eventParams = eventRows.flatMap(([, s, e]) => [classTypeId, s, e, cap]);
    const [result] = await conn.query(
      `INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES ${eventPlaceholders}`,
      eventParams,
    );
    const firstId = (result as { insertId: number }).insertId;
    const createdEvents = eventRows.map(([dateStr], i) => ({ id: firstId + i, date: dateStr }));

    // event_staff を一括 INSERT（staffIds が指定されている場合）
    const rawStaffIds = Array.isArray(staffIds)
      ? [...new Set(staffIds.filter((id) => Number.isInteger(id) && (id as number) > 0) as number[])]
      : [];

    if (rawStaffIds.length > 0) {
      const storePh = ph(storeIds);
      const staffPh = ph(rawStaffIds);
      const [validStaff] = await conn.query(
        `SELECT id FROM staff WHERE id IN (${staffPh}) AND store_id IN (${storePh})`,
        [...rawStaffIds, ...storeIds],
      );
      const confirmedIds = (validStaff as { id: number }[]).map((r) => r.id);

      if (confirmedIds.length > 0) {
        const pairs = createdEvents.flatMap((ev) => confirmedIds.map((staffId) => [ev.id, staffId]));
        const staffPlaceholders = pairs.map(() => "(?, ?)").join(", ");
        await conn.query(`INSERT INTO event_staff (event_id, staff_id) VALUES ${staffPlaceholders}`, pairs.flat());
      }
    }

    await conn.commit();

    await writeAuditLog({
      actorType: "admin",
      actorId: req.session?.account?.accountId ?? null,
      action: "event.create_bulk",
      targetType: "event",
      targetId: null,
      detail: { classTypeId, count: createdEvents.length },
    });

    created(res, { count: createdEvents.length, events: createdEvents });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
