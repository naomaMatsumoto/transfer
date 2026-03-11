import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { type UpdateResult, isMysqlError } from "../../../types/db";

export default async function updateClassType(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
  const id = Number(req.params.id);
  const { code, name, description } = req.body as {
    code?: string;
    name?: string;
    description?: string;
  };
  const sets: string[] = [];
  const params: (string | number | null)[] = [];
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
  params.push(id, ...storeIds);
  try {
    const [result] = await pool.query(
      `UPDATE class_types SET ${sets.join(", ")} WHERE id = ? AND store_id IN (${storeIds.map(() => "?").join(",")})`,
      params,
    );
    if ((result as UpdateResult).affectedRows === 0) {
      res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      return;
    }
    res.json({ id, updated: true });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.CLASS_TYPE_CODE_DUPLICATE });
      return;
    }
    throw err;
  }
}
