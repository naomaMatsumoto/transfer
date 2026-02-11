import { Request, Response, NextFunction } from "express";
import { pool } from "../../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../../constants";

export default async function updateUser(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
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
    if (v.length === 0) {
      res.status(400).json({ error: ERR.MEMBER_NAME_EMPTY });
      return;
    }
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
      res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
      return;
    }
    updates.push("email = ?"); params.push(emailVal);
  }
  if (course_type !== undefined) {
    updates.push("course_type = ?"); params.push(course_type === null || course_type === "" ? null : course_type);
  }
  if (stage !== undefined) {
    const v = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
    updates.push("stage = ?"); params.push(v);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: ERR.MEMBER_UPDATE_EMPTY });
    return;
  }
  params.push(id);
  try {
    const [result] = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params,
    );
    if ((result as any).affectedRows === 0) {
      res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
      return;
    }
    res.json({ id, updated: true });
  } catch (err: any) {
    if (err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      return;
    }
    throw err;
  }
}
