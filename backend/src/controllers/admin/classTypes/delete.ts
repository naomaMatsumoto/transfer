import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function deleteClassType(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const id = Number(req.params.id);
  try {
    const [result] = await pool.query("DELETE FROM class_types WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      return;
    }
    res.json({ id, deleted: true });
  } catch (err: any) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ error: ERR.CLASS_TYPE_IN_USE });
      return;
    }
    throw err;
  }
}
