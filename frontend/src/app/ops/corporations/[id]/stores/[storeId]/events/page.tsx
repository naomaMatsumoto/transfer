"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getApiBase, apiFetch } from "@/app/lib/api";
import { EventsTab } from "@/app/admin/reservations/_tabs/EventsTab";
import { useOpsData } from "../../../../../hooks";
import { CorporationDetail } from "../../../../../types";
import s from "../../../../../ops.module.scss";

const FLASH_VISIBLE_MS = 3000;
const FLASH_ERR_VISIBLE_MS = 5000;
const FLASH_EXIT_ANIMATION_MS = 300;

type ClassType = { id: number; code: string; name: string; description?: string | null };
type User = { id: number; name: string; email?: string | null; phone?: string | null; course_type?: string | null; stage?: string; status?: string };
type Staff = { id: number; name: string };

export default function OpsStoreEventsPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const storeId = params?.storeId as string | undefined;

  const apiBase = id && storeId ? `${getApiBase()}/ops/corporations/${id}/stores/${storeId}` : "";

  const { data: corp } = useOpsData<CorporationDetail>(id ? `/corporations/${id}` : null, "");
  const store = corp?.stores?.find((s) => String(s.id) === storeId);

  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msgExiting, setMsgExiting] = useState(false);
  const [errExiting, setErrExiting] = useState(false);
  const flashTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearFlashTimeouts = useCallback(() => {
    flashTimeoutsRef.current.forEach((t) => clearTimeout(t));
    flashTimeoutsRef.current = [];
  }, []);

  const flash = useCallback((m: string) => {
    clearFlashTimeouts();
    setErr(null);
    setMsg(m);
    setMsgExiting(false);
    flashTimeoutsRef.current.push(
      setTimeout(() => setMsgExiting(true), FLASH_VISIBLE_MS),
      setTimeout(() => setMsg(null), FLASH_VISIBLE_MS + FLASH_EXIT_ANIMATION_MS),
    );
  }, [clearFlashTimeouts]);

  const flashErr = useCallback((m: string) => {
    clearFlashTimeouts();
    setMsg(null);
    setErr(m);
    setErrExiting(false);
    flashTimeoutsRef.current.push(
      setTimeout(() => setErrExiting(true), FLASH_ERR_VISIBLE_MS),
      setTimeout(() => setErr(null), FLASH_ERR_VISIBLE_MS + FLASH_EXIT_ANIMATION_MS),
    );
  }, [clearFlashTimeouts]);

  useEffect(() => () => clearFlashTimeouts(), [clearFlashTimeouts]);

  useEffect(() => {
    if (!apiBase) return;
    apiFetch(`${apiBase}/class-types`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setClassTypes(Array.isArray(d) ? d : []))
      .catch(() => setClassTypes([]));
    apiFetch(`${apiBase}/staff`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setStaff(Array.isArray(d) ? d : []))
      .catch(() => setStaff([]));
    apiFetch(`${apiBase}/users`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]));
  }, [apiBase]);

  if (!id || !storeId) {
    return (
      <div className={s.centered}>
        <p className="text-danger">不正なURLです。</p>
        <Link href="/ops">← 事業者一覧へ</Link>
      </div>
    );
  }

  if (!apiBase) {
    return null;
  }

  return (
    <div className={s.page}>
      <nav className="mb-3" aria-label="パンくず">
        <Link href="/ops" className="text-body-secondary small me-2">事業者一覧</Link>
        <span className="text-body-secondary small me-2">/</span>
        <Link href={`/ops/corporations/${id}`} className="text-body-secondary small me-2">
          {corp?.name ?? "事業者"}
        </Link>
        <span className="text-body-secondary small me-2">/</span>
        <span className="small fw-medium">{store?.name ?? `店舗 #${storeId}`}</span>
        <span className="text-body-secondary small me-2">/</span>
        <span className="small">イベント・休講</span>
      </nav>

      <h1 className="h4 mb-3">イベント・休講・予約 — {store?.name ?? `店舗 #${storeId}`}</h1>

      {msg && (
        <div className={`alert alert-success mb-3 ${msgExiting ? "fade" : ""}`} role="alert">
          {msg}
        </div>
      )}
      {err && (
        <div className={`alert alert-danger mb-3 ${errExiting ? "fade" : ""}`} role="alert">
          {err}
        </div>
      )}

      <EventsTab
        classTypes={classTypes}
        users={users}
        staff={staff}
        flash={flash}
        flashErr={flashErr}
        apiBase={apiBase}
      />
    </div>
  );
}
