import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId } from "../../../lib/opsHelpers";

export default async function createCorporation(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const body = req.body as { name?: string; organizationType?: string };
  const name = String(body.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }
  const orgType = body.organizationType === "sole_proprietor" ? "sole_proprietor" : "corporation";
  const code = crypto.randomBytes(9).toString("base64url").slice(0, 12);

  const [result] = await pool.query(
    "INSERT INTO corporations (code, organization_type, name) VALUES (?, ?, ?)",
    [code, orgType, name]
  );
  res.status(201).json({ id: getInsertId(result), code, organization_type: orgType, name });
}
