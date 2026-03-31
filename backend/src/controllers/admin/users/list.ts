import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { ok } from "../../../lib/respond";
import { ph } from "../../../lib/validate";
import { parsePagination } from "../../../lib/paginate";

export default async function listUsers(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
  const storePh = ph(storeIds);
  const { keyword, stage, page: pageStr, limit: limitStr } = req.query;
  const { page, limit, offset } = parsePagination(pageStr, limitStr, 50, 9999);

  const conditions: string[] = [`store_id IN (${storePh})`];
  const filterParams: unknown[] = [...storeIds];

  if (keyword) {
    const kw = `%${String(keyword)}%`;
    conditions.push(
      "(name LIKE ? OR furigana LIKE ? OR email LIKE ? OR address LIKE ? OR phone LIKE ? OR course_type LIKE ?)",
    );
    filterParams.push(kw, kw, kw, kw, kw, kw);
  }
  if (stage) {
    conditions.push("stage = ?");
    filterParams.push(stage);
  }

  const where = "WHERE " + conditions.join(" AND ");

  const [[countRow]] = (await pool.query(`SELECT COUNT(*) AS total FROM users ${where}`, filterParams)) as unknown as [
    [{ total: number }],
    unknown,
  ];

  const [rows] = await pool.query(
    `SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at
     FROM users ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
    [...filterParams, limit, offset],
  );

  ok(res, { data: rows, total: Number(countRow.total), page, limit });
}
