import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";

export default async function updateStatus(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const { status } = req.body as { status?: string };

  if (status !== "active" && status !== "suspended") {
    res.status(400).json({ error: "INVALID_STATUS" });
    return;
  }

  await pool.query("UPDATE corporations SET status = ? WHERE id = ?", [status, corp.id]);
  await opsAudit(req, "corporation.updateStatus", "corporation", corp.id, { status });
  res.json({ ok: true, status });
}
