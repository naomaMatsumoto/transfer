import { Request, Response, NextFunction } from "express";
import { pool } from "../db";

export async function check(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query("SELECT 1");
  res.json({ status: "ok", db: rows });
}
