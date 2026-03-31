export interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * クエリパラメータからページネーション値を安全に取り出す。
 * @param pageStr  req.query.page
 * @param limitStr req.query.limit
 * @param defaultLimit デフォルト件数（省略時 50）
 * @param maxLimit     最大件数（省略時 9999）
 */
export function parsePagination(pageStr: unknown, limitStr: unknown, defaultLimit = 50, maxLimit = 9999): Pagination {
  const page = Math.max(1, parseInt(String(pageStr ?? "1"), 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(String(limitStr ?? String(defaultLimit)), 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}
