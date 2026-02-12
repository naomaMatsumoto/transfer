import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function getSettings(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) {
    res.status(401).json({ error: "UNAUTHORIZED" });
    return;
  }
  const [rows] = await pool.query(
    "SELECT name FROM corporations WHERE id = ?",
    [corporationId]
  );
  const row = (rows as { name: string }[])[0];
  if (!row) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  res.json({ corporationName: row.name });
}
