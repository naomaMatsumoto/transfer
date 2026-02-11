import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function listClassTypes(
  _req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const [rows] = await pool.query(
    "SELECT id, code, name, description FROM class_types ORDER BY id ASC"
  );
  res.json(rows);
}
