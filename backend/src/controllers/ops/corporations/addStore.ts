import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function addStoreToCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corporationId = Number(req.params.id);
  if (!Number.isInteger(corporationId) || corporationId <= 0) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }
  const body = req.body as { name?: string };
  const name = body.name != null ? String(body.name).trim() : "";
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }
  const [corpRows] = await pool.query("SELECT id FROM corporations WHERE id = ?", [corporationId]);
  if ((corpRows as unknown[]).length === 0) {
    res.status(404).json({ error: "CORPORATION_NOT_FOUND" });
    return;
  }
  const [result] = await pool.query(
    "INSERT INTO stores (corporation_id, name) VALUES (?, ?)",
    [corporationId, name]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, corporation_id: corporationId, name });
}
