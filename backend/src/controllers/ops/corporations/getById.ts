import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";

export default async function getCorporationById(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;

  const [stores] = await pool.query(
    "SELECT id, public_id, name, created_at FROM stores WHERE corporation_id = ? ORDER BY id ASC",
    [corp.id]
  );
  const [accounts] = await pool.query(
    "SELECT id, email, display_name, role, created_at FROM accounts WHERE corporation_id = ? ORDER BY id ASC",
    [corp.id]
  );

  res.json({ ...corp, stores, accounts });
}
