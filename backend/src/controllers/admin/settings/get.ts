import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { unauthorized, notFound, ok } from "../../../lib/respond";

export default async function getSettings(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const corporationId = req.session?.account?.corporationId;
  if (corporationId == null) {
    unauthorized(res);
    return;
  }
  const [rows] = await pool.query(
    "SELECT name FROM corporations WHERE id = ?",
    [corporationId]
  );
  const row = (rows as { name: string }[])[0];
  if (!row) {
    notFound(res, "NOT_FOUND");
    return;
  }
  ok(res, { corporationName: row.name, role: req.session?.account?.role ?? "admin" });
}
