import { type Request } from "express";
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

/**
 * リクエストボディの生の配列から正の整数 ID のみを抽出する。
 * 文字列 "1" も数値に変換する。
 */
export function parseIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((id) => (typeof id === "string" ? parseInt(id, 10) : Number(id)))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/** req.params から正の整数パラメータを取得。不正なら null を返す。 */
export function parseIntParam(req: Request, name: string): number | null {
  const v = Number(req.params[name]);
  return Number.isInteger(v) && v > 0 ? v : null;
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
