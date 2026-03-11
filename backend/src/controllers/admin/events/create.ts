import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function createEvent(
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
    startsAt?: string;
    endsAt?: string;
    capacity?: number;
    staffIds?: number[];
  };
  const { classTypeId, startsAt, endsAt, capacity, staffIds } = body;
  if (!classTypeId || !startsAt || !endsAt) {
    res.status(400).json({ error: ERR.EVENT_CREATE_PARAMS_REQUIRED });
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
  const sql = "INSERT INTO events (class_type_id, starts_at, ends_at, capacity, status) VALUES (?, ?, ?, ?, 'scheduled')";
  const [result] = await pool.query(sql, [classTypeId, startsAt, endsAt, capacity ?? 6]);
  const insertId = (result as { insertId: number }).insertId;

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
        [insertId, staffId]
      );
    }
  }
  res.status(201).json({ id: insertId });
}
