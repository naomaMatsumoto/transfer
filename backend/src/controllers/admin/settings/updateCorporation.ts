import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function updateCorporationName(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  const body = req.body as { name?: string };
  const name = body.name != null ? String(body.name).trim() : "";
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }
  const [result] = await pool.query(
    "UPDATE corporations SET name = ?, updated_at = NOW() WHERE id = ?",
    [name, corporationId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  res.json({ ok: true, name });
}
