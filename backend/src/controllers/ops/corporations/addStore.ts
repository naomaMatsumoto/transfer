import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId, opsAudit } from "../../../lib/opsHelpers";
import { badRequest, created } from "../../../lib/respond";

export default async function addStore(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const corp = req.corporation!;
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    badRequest(res, "NAME_REQUIRED");
    return;
  }

  const publicId = crypto.randomUUID();
  const [result] = await pool.query("INSERT INTO stores (corporation_id, public_id, name) VALUES (?, ?, ?)", [
    corp.id,
    publicId,
    name,
  ]);
  const storeId = getInsertId(result);
  await opsAudit(req, "store.create", "store", storeId, { name, corporationId: corp.id });
  created(res, { id: storeId, public_id: publicId, name });
}
