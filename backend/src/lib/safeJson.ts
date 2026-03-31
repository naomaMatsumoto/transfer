/**
 * JSON 文字列を安全にパースする。
 * MySQL の JSON カラムがドライバによって文字列で返される場合の workaround。
 * パース失敗・非文字列の場合は fallback を返す。
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return (value as T) ?? fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
