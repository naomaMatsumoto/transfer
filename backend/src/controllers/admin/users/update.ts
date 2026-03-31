import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { ERR, isValidEmail } from "../../../constants";
import { writeAuditLog, adminActorId } from "../../../lib/auditLog";
import { type UpdateResult, isMysqlError } from "../../../types/db";
import { badRequest, notFound, ok } from "../../../lib/respond";
import { optStr, normalizeStage, ph } from "../../../lib/validate";

export default async function updateUser(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const storeIds = req.storeIds!;
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
      badRequest(res, ERR.MEMBER_NAME_EMPTY);
      return;
    }
    updates.push("name = ?");
    params.push(v);
  }
  if (furigana !== undefined) {
    updates.push("furigana = ?");
    params.push(optStr(furigana));
  }
  if (address !== undefined) {
    updates.push("address = ?");
    params.push(optStr(address));
  }
  if (phone !== undefined) {
    updates.push("phone = ?");
    params.push(optStr(phone));
  }
  if (email !== undefined) {
    const emailVal = optStr(email);
    if (emailVal !== null && !isValidEmail(emailVal)) {
      badRequest(res, ERR.MEMBER_EMAIL_INVALID);
      return;
    }
    updates.push("email = ?");
    params.push(emailVal);
  }
  if (course_type !== undefined) {
    updates.push("course_type = ?");
    params.push(course_type === null || course_type === "" ? null : course_type);
  }
  if (stage !== undefined) {
    updates.push("stage = ?");
    params.push(normalizeStage(stage));
  }
  if (password !== undefined) {
    const hash =
      password != null && String(password).trim() !== "" ? await bcrypt.hash(String(password).trim(), 10) : null;
    updates.push("password_hash = ?");
    params.push(hash);
  }
  if (updates.length === 0) {
    badRequest(res, ERR.MEMBER_UPDATE_EMPTY);
    return;
  }
  const placeholders = ph(storeIds);
  params.push(id, ...storeIds);
  try {
    const [result] = await pool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ? AND store_id IN (${placeholders})`,
      params,
    );
    if ((result as UpdateResult).affectedRows === 0) {
      notFound(res, ERR.MEMBER_NOT_FOUND);
      return;
    }
    void writeAuditLog({
      actorType: "admin",
      actorId: req.session?.account?.accountId,
      action: "member.update",
      targetType: "user",
      targetId: id,
    });
    ok(res, { id, updated: true });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_DUP_ENTRY") {
      badRequest(res, ERR.MEMBER_EMAIL_DUPLICATE);
      return;
    }
    throw err;
  }
}
