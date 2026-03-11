"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { opsFetch, type ApiResult } from "./api";

type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

export function useOpsData<T>(
  path: string | null,
  errorMsg = "データの取得に失敗しました",
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    const r = await opsFetch<T>(path);
    if (r.ok && r.data != null) {
      setData(r.data);
    } else {
      setError(r.status === 404 ? "データが見つかりません" : errorMsg);
    }
    setLoading(false);
  }, [path, errorMsg]);

  useEffect(() => { void load(); }, [load]);

  return { data, loading, error, reload: load };
}

type SubmitState = {
  submitting: boolean;
  error: string | null;
  run: <T = unknown>(fn: () => Promise<ApiResult<T>>, opts?: { onSuccess?: (data: T | undefined) => void; errorMsg?: string }) => Promise<boolean>;
  clearError: () => void;
};

export function useSubmit(): SubmitState {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async <T = unknown>(
    fn: () => Promise<ApiResult<T>>,
    opts?: { onSuccess?: (data: T | undefined) => void; errorMsg?: string },
  ): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    const r = await fn();
    if (!mounted.current) return r.ok;
    setSubmitting(false);
    if (r.ok) {
      opts?.onSuccess?.(r.data as T | undefined);
      return true;
    }
    setError(opts?.errorMsg ?? "処理に失敗しました");
    return false;
  }, []);

  return { submitting, error, run, clearError: () => setError(null) };
}
