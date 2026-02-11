import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

function generateClassTypeCode(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff-]/g, "");
  if (slug.length > 0 && slug.length <= 50) return slug;
  return `ct_${Date.now()}`;
}

router.get("/class-types", asyncHandler(async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    "SELECT id, code, name, description FROM class_types ORDER BY id ASC",
  );
  res.json(rows);
}));

router.post("/class-types", asyncHandler(async (req: Request, res: Response) => {
  const { code, name, description } = req.body as {
    code?: string;
    name?: string;
    description?: string;
  };
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: ERR.CLASS_TYPE_NAME_REQUIRED });
  }
  const trimmedName = String(name).trim();
  const codeToUse = code && String(code).trim() ? String(code).trim() : generateClassTypeCode(trimmedName);
  try {
    const [result] = await pool.query(
      "INSERT INTO class_types (code, name, description) VALUES (?, ?, ?)",
      [codeToUse, trimmedName, description ?? null],
    );
    res.status(201).json({ id: (result as any).insertId, code: codeToUse, name: trimmedName });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      return;
    }
    throw err;
  }
}));

router.patch("/class-types/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { code, name, description } = req.body as {
    code?: string;
    name?: string;
    description?: string;
  };
  const sets: string[] = [];
  const params: any[] = [];
  if (code !== undefined) { sets.push("code = ?"); params.push(String(code).trim()); }
  if (name !== undefined) {
    const v = String(name).trim();
    if (v.length === 0) return res.status(400).json({ error: ERR.CLASS_TYPE_NAME_EMPTY });
    sets.push("name = ?"); params.push(v);
  }
  if (description !== undefined) { sets.push("description = ?"); params.push(description); }
  if (sets.length === 0) {
    return res.status(400).json({ error: ERR.CLASS_TYPE_UPDATE_EMPTY });
  }
  params.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE class_types SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
    }
    res.json({ id, updated: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      return;
    }
    throw err;
  }
}));

router.delete("/class-types/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [result] = await pool.query(
      "DELETE FROM class_types WHERE id = ?",
      [id],
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
    }
    res.json({ id, deleted: true });
  } catch (err: any) {
    if (err.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ error: ERR.CLASS_TYPE_IN_USE });
      return;
    }
    throw err;
  }
}));

export default router;
