import { type Request, type Response, type NextFunction } from "express";
import { pool } from "../../../db";
import { badRequest } from "../../../lib/respond";
import { ph } from "../../../lib/validate";

export default async function reportCsvExport(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const storePh = ph(storeIds);
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (!from || !to) {
    badRequest(res, "FROM_TO_REQUIRED");
    return;
  }

  const [rows] = await pool.query(
    `SELECT
       r.id AS reservation_id,
       u.name AS member_name,
       ct.name AS class_name,
       e.starts_at,
       e.ends_at,
       r.reservation_type,
       r.status,
       r.created_at,
       r.canceled_at
     FROM reservations r
     JOIN events e ON e.id = r.event_id
     JOIN class_types ct ON ct.id = e.class_type_id
     JOIN users u ON u.id = r.user_id
     WHERE ct.store_id IN (${storePh})
       AND e.starts_at >= ? AND e.starts_at < ?
     ORDER BY e.starts_at`,
    [...storeIds, from, to]
  );

  const data = rows as Record<string, unknown>[];
  const headers = ["予約ID", "会員名", "クラス", "開始", "終了", "種別", "ステータス", "作成日", "キャンセル日"];
  const csvLines = [
    headers.join(","),
    ...data.map((r) =>
      [
        r.reservation_id,
        `"${String(r.member_name ?? "").replace(/"/g, '""')}"`,
        `"${String(r.class_name ?? "").replace(/"/g, '""')}"`,
        r.starts_at,
        r.ends_at,
        r.reservation_type,
        r.status,
        r.created_at,
        r.canceled_at ?? "",
      ].join(",")
    ),
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="reservations_${from}_${to}.csv"`);
  res.send("\uFEFF" + csvLines.join("\n"));
}
