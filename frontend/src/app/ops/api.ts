import { getApiBase, apiFetch } from "@/app/lib/api";

const OPS_BASE = `${getApiBase()}/ops`;

export function opsUrl(path: string): string {
  return `${OPS_BASE}${path}`;
}

export type ApiResult<T = unknown> = {
  ok: boolean;
  data?: T;
  status?: number;
};

export async function opsFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<ApiResult<T>> {
  try {
    const res = await apiFetch(opsUrl(path), init);
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data: json as T };
  } catch {
    return { ok: false };
  }
}

export function postJson(path: string, body: unknown): Promise<ApiResult> {
  return opsFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function putJson(path: string, body: unknown): Promise<ApiResult> {
  return opsFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function patchJson<T = unknown>(path: string, body?: unknown): Promise<ApiResult<T>> {
  return opsFetch<T>(path, {
    method: "PATCH",
    ...(body != null && {
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  });
}

const OPS_LOGIN_ERRORS: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "メールアドレスまたはパスワードが正しくありません。",
  EMAIL_PASSWORD_REQUIRED: "メールアドレスとパスワードを入力してください。",
};

export function deleteFetch(path: string): Promise<ApiResult> {
  return opsFetch(path, { method: "DELETE" });
}

export function resolveLoginError(code?: string): string {
  if (code && OPS_LOGIN_ERRORS[code]) return OPS_LOGIN_ERRORS[code];
  return "ログインに失敗しました。";
}
