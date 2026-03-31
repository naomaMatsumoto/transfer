import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, ok } from "../../../lib/respond";
import { ph, parseIds } from "../../../lib/validate";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";

export default async function bulkDeleteEvents(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const body = req.body as { ids?: unknown; force?: boolean };
  const ids = parseIds(body.ids);
  const force = body.force === true;
  if (ids.length === 0) {
    badRequest(res, ERR.EVENT_IDS_REQUIRED);
    return;
  }
  const storePh = ph(storeIds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const idsPh = ph(ids);
    const [allowedRows] = await conn.query(
      `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id IN (${idsPh}) AND ct.store_id IN (${storePh})`,
      [...ids, ...storeIds],
    );
    const allowedIds = (allowedRows as { id: number }[]).map((r) => r.id);
    if (allowedIds.length === 0) {
      await conn.rollback();
      ok(res, { deleted: 0 });
      return;
    }
    const allowedPh = ph(allowedIds);
    if (!force) {
      const q1 =
        "SELECT event_id, COUNT(*) AS cnt FROM reservations WHERE event_id IN (" +
        allowedPh +
        ") AND status IN ('booked','attended') GROUP BY event_id";
      const [activeRes] = await conn.query(q1, allowedIds);
      const activeEvents = activeRes as { event_id: number; cnt: number }[];
      if (activeEvents.length > 0) {
        await conn.rollback();
        const details = activeEvents.map((r) => ({ eventId: r.event_id, count: r.cnt }));
        badRequest(res, ERR.EVENT_BULK_DELETE_HAS_RESERVATIONS, { details });
        return;
      }
    }
    await conn.query("DELETE FROM reservations WHERE event_id IN (" + allowedPh + ")", allowedIds);
    await conn.query(
      "UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id IN (" + allowedPh + ")",
      allowedIds,
    );
    const [result] = await conn.query("DELETE FROM events WHERE id IN (" + allowedPh + ")", allowedIds);
    const deletedCount = (result as { affectedRows: number }).affectedRows;
    await conn.commit();
    await writeAuditLog({
      actorType: "admin",
      actorId: adminActorId(req),
      action: "event.bulk_delete",
      targetType: "event",
      targetId: null,
      detail: { ids: allowedIds, count: deletedCount },
    });
    ok(res, { deleted: deletedCount });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
