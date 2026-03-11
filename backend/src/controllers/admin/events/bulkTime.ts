import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function bulkTimeEvents(
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
    ids?: number[];
    startTime?: string;
    endTime?: string;
  };
  const { ids, startTime, endTime } = body;
  if (!ids || ids.length === 0 || !startTime || !endTime) {
    res.status(400).json({ error: ERR.EVENT_BULK_TIME_PARAMS_REQUIRED });
    return;
  }
  const storePh = storeIds.map(() => "?").join(",");
  let updated = 0;
  for (const id of ids) {
    const [rows] = await pool.query(
      `SELECT e.starts_at, e.ends_at FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePh})`,
      [id, ...storeIds]
    );
    const row = (rows as { starts_at: string; ends_at: string }[])[0];
    if (!row) continue;
    const dateStr = (row.starts_at ?? "").toString().slice(0, 10);
    if (!dateStr || dateStr.length < 10) continue;
    const newStart = `${dateStr} ${startTime}:00`;
    const newEnd = `${dateStr} ${endTime}:00`;
    await pool.query(
      "UPDATE events SET starts_at = ?, ends_at = ?, updated_at = NOW() WHERE id = ?",
      [newStart, newEnd, id]
    );
    updated++;
  }
  res.json({ updated, startTime, endTime });
}
