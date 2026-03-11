import crypto from "crypto";
import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { getInsertId } from "../../../lib/opsHelpers";

export default async function addStore(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corp = req.corporation!;
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "NAME_REQUIRED" });
    return;
  }

  const publicId = crypto.randomUUID();
  const [result] = await pool.query(
    "INSERT INTO stores (corporation_id, public_id, name) VALUES (?, ?, ?)",
    [corp.id, publicId, name]
  );
  res.status(201).json({ id: getInsertId(result), public_id: publicId, name });
}
