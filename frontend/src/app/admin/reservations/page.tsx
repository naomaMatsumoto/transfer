"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RESERVATION_TABS } from "../../routes";
import { adminGet } from "@/app/lib/api";
import { useFlash } from "@/app/lib/useFlash";
import { type ClassType, type User, type Staff, type Tab, parseTab } from "./types";
import { EventsTab } from "./_tabs/EventsTab";
import { CreditsTab } from "./_tabs/CreditsTab";
import { StaffTab } from "./_tabs/StaffTab";
import { ClassTypesTab } from "./_tabs/ClassTypesTab";

function AdminPageContent() {
  const searchParams = useSearchParams();
  const tabFromUrl = parseTab(searchParams.get("tab"));

  const [tab, setTabState] = useState<Tab>(tabFromUrl);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const { msg, err, msgExiting, errExiting, flash, flashErr } = useFlash();

  // URL と同期（サイドバーのリンクで遷移するため）
  useEffect(() => {
    setTabState(tabFromUrl);
  }, [tabFromUrl]);

  const loadClassTypes = useCallback(() => {
    adminGet("/class-types")
      .then((r) => setClassTypes(r.ok && Array.isArray(r.data) ? r.data as ClassType[] : []))
      .catch(() => setClassTypes([]));
  }, []);

  const loadStaff = useCallback(() => {
    adminGet("/staff")
      .then((r) => setStaff(r.ok && Array.isArray(r.data) ? r.data as Staff[] : []))
      .catch(() => setStaff([]));
  }, []);

  // load master data (APIがエラーでも配列として安全に扱う)
  useEffect(() => {
    loadClassTypes();
    loadStaff();
    adminGet("/users")
      .then((r) => setUsers(r.ok && Array.isArray(r.data) ? r.data as User[] : []))
      .catch(() => setUsers([]));
  }, [loadClassTypes, loadStaff]);

  return (
    <>
      <h1 className="h3 mb-4">{RESERVATION_TABS.find((t) => t.key === tab)?.label ?? "予約システム"}</h1>
      {msg && (
        <div className={`alert alert-success mb-3 ${msgExiting ? "fade" : ""}`} role="alert">{msg}</div>
      )}
      {err && (
        <div className={`alert alert-danger mb-3 ${errExiting ? "fade" : ""}`} role="alert">{err}</div>
      )}

      {tab === "classTypes" && <ClassTypesTab classTypes={classTypes} reload={loadClassTypes} flash={flash} flashErr={flashErr} />}
      {tab === "events" && <EventsTab classTypes={classTypes} users={users} staff={staff} flash={flash} flashErr={flashErr} />}
      {tab === "staff" && <StaffTab staffList={staff} reload={loadStaff} flash={flash} flashErr={flashErr} />}
      {tab === "credits" && <CreditsTab classTypes={classTypes} users={users} flash={flash} flashErr={flashErr} />}
    </>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div style={{ padding: "1rem" }}>読み込み中…</div>}>
      <AdminPageContent />
    </Suspense>
  );
}
