import { getApiBase, apiFetch } from "@/app/lib/api";
import type { EventRow, MakeupCredit, StoreRow } from "./types";

export function storesApi(path: string): string {
  return `${getApiBase()}${path}`;
}

export function fetchWithCredentials(url: string, init?: RequestInit): Promise<Response> {
  return apiFetch(url, init);
}

export async function fetchStore(storeId: number): Promise<StoreRow | null> {
  const res = await fetch(storesApi(`/stores/${storeId}`));
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMemberMe(): Promise<{ id?: number } | null> {
  const res = await fetchWithCredentials(storesApi("/members/me"));
  if (!res.ok) return null;
  return res.json();
}

export async function fetchEvents(params: {
  from: string;
  to: string;
  userId: number;
  storeId: number;
}): Promise<EventRow[]> {
  const { from, to, userId, storeId } = params;
  const res = await fetch(
    storesApi(`/events?from=${from}&to=${to}&userId=${userId}&storeId=${storeId}`),
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchMakeupCredits(userId: number): Promise<MakeupCredit[]> {
  const res = await fetchWithCredentials(
    storesApi(`/makeup-credits?userId=${encodeURIComponent(userId)}`),
  );
  if (!res.ok) return [];
  return res.json();
}

export async function postReservation(body: {
  userId: number;
  eventId: number;
  reservationType: "normal" | "makeup";
  makeupCreditId: number | null;
}): Promise<Response> {
  return fetchWithCredentials(storesApi("/reservations"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function postAbsence(body: {
  userId: number;
  eventId: number;
  reason: string;
}): Promise<Response> {
  return fetchWithCredentials(storesApi("/absences"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
