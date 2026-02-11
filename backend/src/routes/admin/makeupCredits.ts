import { Router, Request, Response } from "express";
import { pool } from "../../db";
import { ERR } from "../../constants";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get("/makeup-credits", asyncHandler(async (req: Request, res: Response) => {
  const { userId, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    if (userId) {
      conditions.push("mc.user_id = ?");
      params.push(Number(userId));
    }
    if (status) {
      conditions.push("mc.status = ?");
      params.push(status);
    }
    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
    const [rows] = await pool.query(
      `
      SELECT
        mc.id,
        mc.user_id,
        u.name AS user_name,
        mc.class_type_id,
        ct.name AS class_type_name,
        mc.granted_at,
        mc.expires_at,
        mc.status,
        mc.source,
        mc.source_event_id,
        mc.note,
        mc.created_by
      FROM makeup_credits mc
      LEFT JOIN users u ON u.id = mc.user_id
      LEFT JOIN class_types ct ON ct.id = mc.class_type_id
      ${where}
      ORDER BY mc.granted_at DESC
    `,
      params,
    );
    res.json(rows);
}));

router.post("/makeup-credits", asyncHandler(async (req: Request, res: Response) => {
  const { userId, classTypeId, expiresAt, note, createdBy } = req.body as {
    userId?: number;
    classTypeId?: number | null;
    expiresAt?: string | null;
    note?: string;
    createdBy?: string;
  };
  if (!userId) {
    return res.status(400).json({ error: ERR.CREDIT_USER_ID_REQUIRED });
  }
  try {
    const [result] = await pool.query(
      `INSERT INTO makeup_credits
        (user_id, class_type_id, granted_at, expires_at, status, source, note, created_by)
       VALUES (?, ?, NOW(), ?, 'granted', 'admin_holiday', ?, ?)`,
      [
        userId,
        classTypeId ?? null,
        expiresAt ?? null,
        note ?? null,
        createdBy ?? "admin",
      ],
    );
    res.status(201).json({ id: (result as any).insertId });
  } catch (err) {
    throw err;
  }
}));

router.patch("/makeup-credits/:id", asyncHandler(async (req: Request, res: Response) => {
  const creditId = Number(req.params.id);
  const { status, expiresAt, note } = req.body as {
    status?: "granted" | "consumed" | "revoked";
    expiresAt?: string | null;
    note?: string;
  };
  const sets: string[] = [];
  const params: any[] = [];
  if (status) {
    sets.push("status = ?");
    params.push(status);
  }
  if (expiresAt !== undefined) {
    sets.push("expires_at = ?");
    params.push(expiresAt);
  }
  if (note !== undefined) {
    sets.push("note = ?");
    params.push(note);
  }
  if (sets.length === 0) {
    return res.status(400).json({ error: ERR.CREDIT_UPDATE_EMPTY });
  }
  sets.push("updated_at = NOW()");
  params.push(creditId);
  try {
    const [result] = await pool.query(
      `UPDATE makeup_credits SET ${sets.join(", ")} WHERE id = ?`,
      params,
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    }
    res.json({ id: creditId, updated: true });
  } catch (err) {
    throw err;
  }
}));

router.delete("/makeup-credits/:id", asyncHandler(async (req: Request, res: Response) => {
  const creditId = Number(req.params.id);
  try {
    const [result] = await pool.query(
      "UPDATE makeup_credits SET status = 'revoked', updated_at = NOW() WHERE id = ?",
      [creditId],
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.CREDIT_NOT_FOUND });
    }
    res.json({ id: creditId, status: "revoked" });
  } catch (err) {
    throw err;
  }
}));

export default router;
