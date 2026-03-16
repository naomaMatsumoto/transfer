"use client";

import { useState, useMemo, useEffect } from "react";

export function usePagination<T>(items: T[], perPage: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));

  const paginatedItems = useMemo(() => items.slice((page - 1) * perPage, page * perPage), [items, page, perPage]);

  // ページ数が減少したときに現在のページが範囲外にならないよう調整
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return { page, setPage, totalPages, paginatedItems, total: items.length };
}
