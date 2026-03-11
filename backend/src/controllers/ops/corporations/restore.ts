import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";

export default async function restoreCorp(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;

  if (!corp.deleted_at) {
    res.status(400).json({ error: "NOT_DELETED" });
    return;
  }

  await pool.query("UPDATE corporations SET deleted_at = NULL WHERE id = ?", [corp.id]);
  await opsAudit(req, "corporation.restore", "corporation", corp.id, { name: corp.name });
  res.json({ ok: true });
}
