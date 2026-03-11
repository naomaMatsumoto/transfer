export function formatDate(s: string | null | undefined): string {
  if (!s) return "-";
  return s.slice(0, 10);
}

export function formatDateTime(s: string | null | undefined): string {
  if (!s) return "-";
  return new Date(s).toLocaleString("ja-JP");
}
