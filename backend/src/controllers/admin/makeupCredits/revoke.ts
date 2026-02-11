import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function revokeMakeupCredit(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const creditId = Number(req.params.id);
  const [result] = await pool.query(
    "UPDATE makeup_credits SET status = 'revoked', updated_at = NOW() WHERE id = ?",
    [creditId]
  );
  if ((result as { affectedRows: number }).affectedRows === 0) {
    res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    return;
  }
  res.json({ id: creditId, status: "revoked" });
}
