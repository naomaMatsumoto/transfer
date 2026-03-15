import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../../constants";
import { writeAuditLog } from "../../../lib/auditLog";
import { type InsertResult, isMysqlError } from "../../../types/db";
import { badRequest, created } from "../../../lib/respond";
import { optStr, normalizeStage } from "../../../lib/validate";

export default async function createUser(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = req.storeIds!;
  const storeId = storeIds[0];
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
  if (!name || !String(name).trim()) {
    badRequest(res, ERR.MEMBER_NAME_REQUIRED);
    return;
  }
  const trimmedName = String(name).trim();
  const furiganaVal = optStr(furigana);
  const emailTrimmed = optStr(email);
  if (emailTrimmed !== null && !isValidEmail(emailTrimmed)) {
    badRequest(res, ERR.MEMBER_EMAIL_INVALID);
    return;
  }
  const addressVal = optStr(address);
  const phoneVal = optStr(phone);
  const stageVal = normalizeStage(stage);
  const passwordVal =
    password != null && String(password).trim() !== "" ? await bcrypt.hash(String(password).trim(), 10) : null;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (store_id, name, furigana, email, password_hash, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [storeId, trimmedName, furiganaVal, emailTrimmed, passwordVal, addressVal, phoneVal, course_type ?? null, stageVal],
    );
    const newId = (result as InsertResult).insertId;
    void writeAuditLog({ actorType: "admin", actorId: req.session?.account?.accountId, action: "member.create", targetType: "user", targetId: newId, detail: { name: trimmedName } });
    created(res, {
      id: newId,
      name: trimmedName,
      furigana: furiganaVal,
      email: emailTrimmed,
      address: addressVal,
      phone: phoneVal,
      course_type: course_type ?? null,
      stage: stageVal,
    });
  } catch (err: unknown) {
    if (isMysqlError(err) && err.code === "ER_DUP_ENTRY") {
      badRequest(res, ERR.MEMBER_EMAIL_DUPLICATE);
      return;
    }
    throw err;
  }
}
