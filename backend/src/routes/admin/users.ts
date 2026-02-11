import { Router, Request, Response, NextFunction } from "express";
import { pool } from "../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../constants";
import { asyncHandler } from "../../middleware/asyncHandler";

const router = Router();

router.get("/users", asyncHandler(async (_req: Request, res: Response) => {
  const [rows] = await pool.query(
    "SELECT id, name, furigana, email, address, phone, course_type, stage, status, created_at FROM users ORDER BY id ASC",
  );
  res.json(rows);
}));

router.post("/users", asyncHandler(async (req: Request, res: Response) => {
  const { name, furigana, email, address, phone, course_type, stage } = req.body as {
    name?: string;
    furigana?: string | null;
    email?: string;
    address?: string | null;
    phone?: string | null;
    course_type?: string | null;
    stage?: string;
  };
  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: ERR.MEMBER_NAME_REQUIRED });
  }
  const trimmedName = String(name).trim();
  const furiganaVal = furigana != null && String(furigana).trim() !== "" ? String(furigana).trim() : null;
  const emailTrimmed = email != null && String(email).trim() !== "" ? String(email).trim() : null;
  if (emailTrimmed !== null && !isValidEmail(emailTrimmed)) {
    return res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
  }
  const addressVal = address != null && String(address).trim() !== "" ? String(address).trim() : null;
  const phoneVal = phone != null && String(phone).trim() !== "" ? String(phone).trim() : null;
  const stageVal = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
  try {
    const [result] = await pool.query(
      "INSERT INTO users (name, furigana, email, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [trimmedName, furiganaVal, emailTrimmed, addressVal, phoneVal, course_type ?? null, stageVal],
    );
    res.status(201).json({
      id: (result as any).insertId,
      name: trimmedName,
      furigana: furiganaVal,
      email: emailTrimmed,
      address: addressVal,
      phone: phoneVal,
      course_type: course_type ?? null,
      stage: stageVal,
    });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      return;
    }
    throw err;
  }
}));

router.patch("/users/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, furigana, email, address, phone, course_type, stage } = req.body as {
    name?: string;
    furigana?: string | null;
    email?: string;
    address?: string | null;
    phone?: string | null;
    course_type?: string | null;
    stage?: string;
  };
  const updates: string[] = [];
  const params: any[] = [];
  if (name !== undefined) {
    const v = String(name).trim();
    if (v.length === 0) return res.status(400).json({ error: ERR.MEMBER_NAME_EMPTY });
    updates.push("name = ?"); params.push(v);
  }
  if (furigana !== undefined) {
    updates.push("furigana = ?"); params.push(furigana == null || String(furigana).trim() === "" ? null : String(furigana).trim());
  }
  if (address !== undefined) {
    updates.push("address = ?"); params.push(address == null || String(address).trim() === "" ? null : String(address).trim());
  }
  if (phone !== undefined) {
    updates.push("phone = ?"); params.push(phone == null || String(phone).trim() === "" ? null : String(phone).trim());
  }
  if (email !== undefined) {
    const v = String(email).trim();
    const emailVal = v === "" ? null : v;
    if (emailVal !== null && !isValidEmail(emailVal)) {
      return res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
    }
    updates.push("email = ?"); params.push(emailVal);
  }
  if (course_type !== undefined) { updates.push("course_type = ?"); params.push(course_type === null || course_type === "" ? null : course_type); }
  if (stage !== undefined) {
    const v = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
    updates.push("stage = ?"); params.push(v);
  }
  if (updates.length === 0) {
    return res.status(400).json({ error: ERR.MEMBER_UPDATE_EMPTY });
  }
  params.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
    }
    res.json({ id, updated: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      return;
    }
    throw err;
  }
}));

router.delete("/users/:id", asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  try {
    const [refCredits] = await pool.query("SELECT 1 FROM makeup_credits WHERE user_id = ? LIMIT 1", [id]);
    const [refRes] = await pool.query("SELECT 1 FROM reservations WHERE user_id = ? LIMIT 1", [id]);
    if ((refCredits as any[]).length > 0 || (refRes as any[]).length > 0) {
      return res.status(400).json({ error: ERR.MEMBER_DELETE_HAS_REFERENCES });
    }
    const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
    }
    res.json({ id, deleted: true });
  } catch (err) {
    throw err;
  }
}));

export default router;
