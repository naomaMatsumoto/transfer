import { getApiBase, apiFetch, apiRequest, type ApiResult } from "@/app/lib/api";
export type { ApiResult } from "@/app/lib/api";

const OPS_BASE = `${getApiBase()}/ops`;

export function opsUrl(path: string): string {
  return `${OPS_BASE}${path}`;
}

export function opsFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): ReturnType<typeof apiRequest<T>> {
  return apiRequest<T>(opsUrl(path), init);
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
