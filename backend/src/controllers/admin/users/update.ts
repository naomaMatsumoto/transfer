import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { writeAuditLog } from "../../../lib/auditLog";
import { type UpdateResult, isMysqlError } from "../../../types/db";

export default async function updateUser(
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
  const { name, furigana, email, password, address, phone, course_type, stage } = req.body as {
    name?: string;
    furigana?: string | null;
    email?: string;
    password?: string | null;
    address?: string | null;
    phone?: string | null;
    course_type?: string | null;
    stage?: string;
  };
  const updates: string[] = [];
  const params: (string | number | null)[] = [];
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
    const emailVal = email == null || String(email).trim() === "" ? null : String(email).trim();
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
    const v = stage && (STAGE_VALUES as readonly string[]).includes(stage) ? stage : "other";
    updates.push("stage = ?"); params.push(v);
  }
  if (password !== undefined) {
    const hash = password != null && String(password).trim() !== "" ? await bcrypt.hash(String(password).trim(), 10) : null;
    updates.push("password_hash = ?"); params.push(hash);
  }
  if (updates.length === 0) {
    res.status(400).json({ error: ERR.MEMBER_UPDATE_EMPTY });
    return;
  }
  const placeholders = storeIds.map(() => "?").join(",");
  params.push(id, ...storeIds);
  try {
    const [result] = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND store_id IN (${placeholders})`,
      params,
    );
    if ((result as UpdateResult).affectedRows === 0) {
      res.status(404).json({ error: ERR.MEMBER_NOT_FOUND });
      return;
    }
    void writeAuditLog({ actorType: "admin", actorId: req.session?.account?.accountId, action: "member.update", targetType: "user", targetId: id });
    res.json({ id, updated: true });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      return;
    }
    throw err;
  }
}
