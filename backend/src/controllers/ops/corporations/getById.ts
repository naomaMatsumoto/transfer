import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function getCorporationById(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "INVALID_ID" });
    return;
  }
  const [corpRows] = await pool.query(
    "SELECT id, organization_type, name, created_at FROM corporations WHERE id = ?",
    [id]
  );
  const corp = (corpRows as { id: number; organization_type: string; name: string; created_at: string }[])[0];
  if (!corp) {
    res.status(404).json({ error: "NOT_FOUND" });
    return;
  }
  const [stores] = await pool.query(
    "SELECT id, name, created_at FROM stores WHERE corporation_id = ? ORDER BY id ASC",
    [id]
  );
  const [accounts] = await pool.query(
    "SELECT id, email, display_name, created_at FROM accounts WHERE corporation_id = ? ORDER BY id ASC",
    [id]
  );
  res.json({
    id: corp.id,
    organization_type: corp.organization_type,
    name: corp.name,
    created_at: corp.created_at,
    stores: stores as { id: number; name: string; created_at: string }[],
    accounts: accounts as { id: number; email: string; display_name: string | null; created_at: string }[],
  });
}
