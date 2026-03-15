import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, getAffectedRows } from "../../../lib/opsHelpers";
import { badRequest, notFound, ok } from "../../../lib/respond";

export default async function updateStore(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const storeId = parseIntParam(req, "storeId");
  if (!storeId) {
    badRequest(res, "INVALID_ID");
    return;
  }

  const body = req.body as {
    name?: string;
    booking_deadline_days?: number | null;
    cancel_deadline_hours?: number | null;
  };

  const updates: string[] = [];
  const params: (string | number | null)[] = [];

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      badRequest(res, "NAME_REQUIRED");
      return;
    }
    updates.push("name = ?");
    params.push(name);
  }
  if (body.booking_deadline_days !== undefined) {
    updates.push("booking_deadline_days = ?");
    params.push(body.booking_deadline_days);
  }
  if (body.cancel_deadline_hours !== undefined) {
    updates.push("cancel_deadline_hours = ?");
    params.push(body.cancel_deadline_hours);
  }

  if (updates.length === 0) {
    badRequest(res, "UPDATE_EMPTY");
    return;
  }

  params.push(storeId, corp.id);
  const [result] = await pool.query(
    `UPDATE stores SET ${updates.join(", ")} WHERE id = ? AND corporation_id = ?`,
    params
  );
  if (getAffectedRows(result) === 0) {
    notFound(res, "STORE_NOT_FOUND");
    return;
  }
  ok(res, { ok: true });
}
