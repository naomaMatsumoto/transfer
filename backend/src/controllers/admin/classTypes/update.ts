import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";

export default async function updateClassType(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const id = Number(req.params.id);
  const { code, name, description } = req.body as {
    code?: string;
    name?: string;
    description?: string;
  };
  const sets: string[] = [];
  const params: any[] = [];
  if (code !== undefined) {
    sets.push("code = ?"); params.push(String(code).trim());
  }
  if (name !== undefined) {
    const v = String(name).trim();
    if (v.length === 0) {
      res.status(400).json({ error: ERR.CLASS_TYPE_NAME_EMPTY });
      return;
    }
    sets.push("name = ?"); params.push(v);
  }
  if (description !== undefined) {
    sets.push("description = ?"); params.push(description);
  }
  if (sets.length === 0) {
    res.status(400).json({ error: ERR.CLASS_TYPE_UPDATE_EMPTY });
    return;
  }
  params.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE class_types SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      return;
    }
    res.json({ id, updated: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      return;
    }
    throw err;
  }
}
