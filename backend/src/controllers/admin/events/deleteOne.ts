import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { writeAuditLog } from "../../../lib/auditLog";

export default async function deleteOneEvent(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const eventId = Number(req.params.id);
  const storePlaceholders = ph(storeIds);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [eventScope] = await conn.query(
      `SELECT e.id FROM events e JOIN class_types ct ON ct.id = e.class_type_id WHERE e.id = ? AND ct.store_id IN (${storePlaceholders})`,
      [eventId, ...storeIds],
    );
    if ((eventScope as unknown[]).length === 0) {
      await conn.rollback();
      notFound(res, ERR.EVENT_NOT_FOUND);
      return;
    }
    const [reservations] = await conn.query(
      "SELECT id FROM reservations WHERE event_id = ? AND status IN ('booked','attended')",
      [eventId],
    );
    if ((reservations as unknown[]).length > 0) {
      await conn.rollback();
      badRequest(res, ERR.EVENT_DELETE_HAS_RESERVATIONS, {
        count: (reservations as unknown[]).length,
      });
      return;
    }
    await conn.query("DELETE FROM reservations WHERE event_id = ?", [eventId]);
    await conn.query("UPDATE makeup_credits SET source_event_id = NULL WHERE source_event_id = ?", [eventId]);
    const [result] = await conn.query("DELETE FROM events WHERE id = ?", [eventId]);
    if ((result as { affectedRows: number }).affectedRows === 0) {
      await conn.rollback();
      notFound(res, ERR.EVENT_NOT_FOUND);
      return;
    }
    await conn.commit();
    await writeAuditLog({
      actorType: "admin",
      actorId: req.session?.account?.accountId ?? null,
      action: "event.delete",
      targetType: "event",
      targetId: eventId,
      detail: null,
    });
    ok(res, { id: eventId, deleted: true });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
