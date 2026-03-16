import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../db";
import { notFound, ok } from "../../lib/respond";

export default async function getStoreById(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    notFound(res, "STORE_NOT_FOUND");
    return;
  }
  const [rows] = await pool.query(
    `SELECT s.id, s.name FROM stores s
     JOIN corporations c ON c.id = s.corporation_id
     WHERE s.id = ? AND c.status = 'active' AND c.deleted_at IS NULL
     LIMIT 1`,
    [id],
  );
  const store = (rows as { id: number; name: string }[])[0];
  if (!store) {
    notFound(res, "STORE_NOT_FOUND");
    return;
  }
  ok(res, store);
}
