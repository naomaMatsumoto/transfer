import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import { pool } from "../../../db";
import { ERR, STAGE_VALUES, isValidEmail } from "../../../constants";
import { getStoreIdsForRequest } from "../../../lib/corporationStores";

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
  const stageVal = stage && STAGE_VALUES.includes(stage as any) ? stage : "other";
  const passwordVal =
    password != null && String(password).trim() !== "" ? await bcrypt.hash(String(password).trim(), 10) : null;
  try {
    const [result] = await pool.query(
      "INSERT INTO users (store_id, name, furigana, email, password_hash, address, phone, course_type, stage) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [storeId, trimmedName, furiganaVal, emailTrimmed, passwordVal, addressVal, phoneVal, course_type ?? null, stageVal],
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
}
