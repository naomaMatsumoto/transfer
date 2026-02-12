import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";

export default async function createCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { name?: string; organizationType?: "corporation" | "sole_proprietor" };
  const name = body.name != null ? String(body.name).trim() : "";
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }
  const orgType = body.organizationType === "sole_proprietor" ? "sole_proprietor" : "corporation";
  const [result] = await pool.query(
    "INSERT INTO corporations (organization_type, name) VALUES (?, ?)",
    [orgType, name]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ id: insertId, organization_type: orgType, name });
}
