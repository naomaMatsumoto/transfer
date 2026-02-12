import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

export default async function updateEventTime(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const eventId = Number(req.params.id);
  const body = req.body as { startsAt?: string; endsAt?: string };
  const { startsAt, endsAt } = body;
  if (!startsAt || !endsAt) {
    res.status(400).json({ error: ERR.EVENT_TIME_PARAMS_REQUIRED });
    return;
  }
  const storePh = storeIds.map(() => "?").join(",");
  const [result] = await pool.query(
    `UPDATE events e JOIN class_types ct ON ct.id = e.class_type_id SET e.starts_at = ?, e.ends_at = ?, e.updated_at = NOW() WHERE e.id = ? AND ct.store_id IN (${storePh})`,
    [startsAt, endsAt, eventId, ...storeIds]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.EVENT_NOT_FOUND });
    return;
  }
  res.json({ id: eventId, startsAt, endsAt });
}
