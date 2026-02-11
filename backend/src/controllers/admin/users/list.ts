import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function listUsers(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query(
    "SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users ORDER BY id ASC"
  );
  res.json(rows);
}
