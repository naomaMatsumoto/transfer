import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function createBulkEvents(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
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
    res.status(400).json({ error: ERR.EVENT_BULK_PARAMS_REQUIRED });
    return;
  }

  const placeholders = storeIds.map(() => "?").join(",");
  const [ctRows] = await pool.query(
    `SELECT id FROM class_types WHERE id = ? AND store_id IN (${placeholders})`,
    [classTypeId, ...storeIds]
  );
  if ((ctRows as unknown[]).length === 0) {
    res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
    return;
  }

  const excludeSet = new Set(excludeDates ?? []);
  const created: { id: number; date: string }[] = [];

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
      created.push({ id: eventId, date: dateStr });
      const ids = Array.isArray(staffIds) ? staffIds.filter((id) => Number.isInteger(id) && id > 0) : [];
      const uniqueIds = [...new Set(ids)];
      for (const staffId of uniqueIds) {
        const [staffRows] = await pool.query(
          `SELECT id FROM staff WHERE id = ? AND store_id IN (${placeholders})`,
          [staffId, ...storeIds]
        );
        if ((staffRows as unknown[]).length > 0) {
          await pool.query(
            "INSERT INTO event_staff (event_id, staff_id) VALUES (?, ?)",
            [eventId, staffId]
          );
        }
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  res.status(201).json({ count: created.length, events: created });
}
