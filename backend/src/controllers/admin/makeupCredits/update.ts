import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function updateMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const creditId = Number(req.params.id);
  const body = req.body as { status?: string; expiresAt?: string | null; note?: string };
  const { status, expiresAt, note } = body;
  const sets: string[] = [];
  const params: unknown[] = [];
  if (status) {
    sets.push("status = ?");
    params.push(status);
  }
  if (expiresAt !== undefined) {
    sets.push("expires_at = ?");
    params.push(expiresAt);
  }
  if (note !== undefined) {
    sets.push("note = ?");
    params.push(note);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: ERR.CREDIT_UPDATE_EMPTY });
    return;
  }
  sets.push("updated_at = NOW()");
  params.push(creditId);
  const [result] = await pool.query("UPDATE makeup_credits SET " + sets.join(", ") + " WHERE id = ?", params);
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    return;
  }
  res.json({ id: creditId, updated: true });
}
