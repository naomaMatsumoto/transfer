import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { opsAudit } from "../../../lib/opsHelpers";

export default async function updateCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const { name: rawName, organizationType } = req.body as { name?: string; organizationType?: string };
  const name = rawName != null ? String(rawName).trim() : undefined;
  const orgType = organizationType === "sole_proprietor" ? "sole_proprietor" : organizationType === "corporation" ? "corporation" : undefined;

  if (!name && !orgType) {
    res.status(400).json({ error: "UPDATE_EMPTY" });
    return;
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  if (name) { sets.push("name = ?"); params.push(name); }
  if (orgType) { sets.push("organization_type = ?"); params.push(orgType); }
  params.push(corp.id);

  await pool.query(`UPDATE corporations SET ${sets.join(", ")} WHERE id = ?`, params);
  await opsAudit(req, "corporation.update", "corporation", corp.id, { name, orgType });
  res.json({ ok: true });
}
