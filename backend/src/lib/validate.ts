import { STAGE_VALUES, isValidEmail } from "../constants";

export type StageValue = (typeof STAGE_VALUES)[number];

/** null/undefined・空文字を null に正規化してトリムして返す */
export function optStr(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

/** メールアドレスを小文字に正規化して返す。無効なら null */
export function normalizeEmail(v: unknown): string | null {
  const s = optStr(v);
  if (s === null) return null;
  const lower = s.toLowerCase();
  return isValidEmail(lower) ? lower : null;
}

/** stage 値を検証して返す。不正なら "other" */
export function normalizeStage(v: unknown): StageValue {
  if (typeof v === "string" && (STAGE_VALUES as readonly string[]).includes(v)) {
    return v as StageValue;
  }
  return "other";
}

/** SQL IN句用プレースホルダ生成: [?,?,?] */
export function ph(arr: unknown[]): string {
  return arr.map(() => "?").join(",");
}

/** 整数 ID として有効か */
export function isValidId(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/** パスワードとして有効か（6文字以上の文字列）*/
export function isValidPassword(v: unknown): v is string {
  return typeof v === "string" && v.length >= 6;
}
