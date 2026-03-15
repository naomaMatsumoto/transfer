const API_BASE = (() => {
  const u = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (u && (u.startsWith("http://") || u.startsWith("https://"))) return u.replace(/\/$/, "");
  return "http://localhost:4000";
})();

export function getApiBase(): string {
  return API_BASE;
}

/** セッション Cookie を付与した fetch */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { ...init, credentials: "include" });
}

// ---------------------------------------------------------------------------
// 共通レスポンス型
// ---------------------------------------------------------------------------

export type ApiResult<T = unknown> = { ok: boolean; data?: T; status?: number };

/** apiFetch を実行し、JSON パースまで行って ApiResult を返す */
export async function apiRequest<T = unknown>(
  url: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await apiFetch(url, init);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json as T };
  } catch {
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// 管理画面用ヘルパー（/admin プレフィックス付き）
// ---------------------------------------------------------------------------

function adminUrl(path: string): string {
  return `${API_BASE}/admin${path}`;
}

export function adminGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(adminUrl(path));
}

export function adminPost<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(adminUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminPatch<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(adminUrl(path), {
    method: "PATCH",
    ...(body != null && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

export function adminPut<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(adminUrl(path), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function adminDelete<T = unknown>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(adminUrl(path), { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// 公開エンドポイント用ヘルパー（/admin プレフィックスなし）
// ---------------------------------------------------------------------------

export function publicGet<T = unknown>(path: string): Promise<ApiResult<T>> {
  return apiRequest<T>(`${API_BASE}${path}`);
}

export function publicPost<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return apiRequest<T>(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
