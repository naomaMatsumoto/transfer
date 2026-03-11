import { type Request, type Response, type NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";
import { writeAuditLog } from "../../../lib/auditLog";
import { type InsertResult, isMysqlError } from "../../../types/db";

export default async function createUser(
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> {
  const storeIds = await getStoreIdsForRequest(req);
  if (storeIds.length === 0) {
    res.status(403).json({ error: "FORBIDDEN" });
    return;
  }
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
    res.status(400).json({ error: ERR.MEMBER_NAME_REQUIRED });
    return;
  }
  const trimmedName = String(name).trim();
  const furiganaVal = furigana != null && String(furigana).trim() !== "" ? String(furigana).trim() : null;
  const emailTrimmed = email != null && String(email).trim() !== "" ? String(email).trim() : null;
  if (emailTrimmed !== null && !isValidEmail(emailTrimmed)) {
    res.status(400).json({ error: ERR.MEMBER_EMAIL_INVALID });
    return;
  }
  const addressVal = address == null || String(address).trim() === "" ? null : String(address).trim();
  const phoneVal = phone == null || String(phone).trim() === "" ? null : String(phone).trim();
  const stageVal = stage && (STAGE_VALUES as readonly string[]).includes(stage) ? stage : "other";
  const passwordVal =
    password != null && String(password).trim() !== "" ? await bcrypt.hash(String(password).trim(), 10) : null;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (store_id, name, furigana, email, password_hash, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [storeId, trimmedName, furiganaVal, emailTrimmed, passwordVal, addressVal, phoneVal, course_type ?? null, stageVal],
    );
    const newId = (result as InsertResult).insertId;
    void writeAuditLog({ actorType: "admin", actorId: req.session?.account?.accountId, action: "member.create", targetType: "user", targetId: newId, detail: { name: trimmedName } });
    res.status(201).json({
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
      res.status(400).json({ error: ERR.MEMBER_EMAIL_DUPLICATE });
      return;
    }
    throw err;
  }
}
