import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ERR } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { type UpdateResult, isMysqlError } from "../../../types/db";

export default async function deleteClassType(
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
  const placeholders = storeIds.map(() => "?").join(",");
  try {
    const [result] = await pool.query(
      `DELETE FROM class_types WHERE id = ? AND store_id IN (${placeholders})`,
      [id, ...storeIds]
    );
    if ((result as UpdateResult).affectedRows === 0) {
      res.status(404).json({ error: ERR.CLASS_TYPE_NOT_FOUND });
      return;
    }
    res.json({ id, deleted: true });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_ROW_IS_REFERENCED_2") {
      res.status(400).json({ error: ERR.CLASS_TYPE_IN_USE });
      return;
    }
    throw err;
  }
}
