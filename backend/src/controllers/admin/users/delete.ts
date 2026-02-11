import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function deleteUser(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const id = Number(req.params.id);
  const [refCredits] = await pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
  const [refRes] = await pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
  if ((refCredits as any[]).length > 0 || (refRes as any[]).length > 0) {
    res.status(400).json({ error: ERR.MEMBER_DELETE_HAS_REFERENCES });
    return;
  }
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  if ((result as any).affectedRows === 0) {
    res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
    return;
  }
  res.json({ id, deleted: true });
}
