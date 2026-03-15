import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";
import { ok } from "../../../lib/respond";

export default async function deleteCorp(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  await pool.query("UPDATE corporations SET deleted_at = NOW() WHERE id = ?", [corp.id]);
  await opsAudit(req, "corporation.delete", "corporation", corp.id, { name: corp.name });
  ok(res, { ok: true });
}
