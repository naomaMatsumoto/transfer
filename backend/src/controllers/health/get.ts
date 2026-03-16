import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { ok } from "../../lib/respond";

export default async function getHealth(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  const [rows] = await pool.query("SELECT 1");
  ok(res, { status: "ok", db: rows });
}
