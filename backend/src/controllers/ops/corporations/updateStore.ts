import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { parseIntParam, findOwned, getAffectedRows } from "../../../lib/opsHelpers";

export default async function updateStore(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const storeId = parseIntParam(req, "storeId");
  if (!storeId) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }

  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }

  const [result] = await pool.query(
    "UPDATE stores SET name = ? WHERE id = ? AND corporation_id = ?",
    [name, storeId, corp.id]
  );
  if (getAffectedRows(result) === 0) {
    res.status(404).json({ error: "STORE_NOT_FOUND" });
    return;
  }
  res.json({ ok: true });
}
