"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import s from "./admin.module.scss";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type ClassType = { id: number; code: string; name: string; description?: string | null };
type User = { id: number; name: string; email: string; grade: number | null; course_type: string | null; status: string };
type AdminEvent = {
  id: number;
  class_type_id: number;
  class_type_name: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  status: string;
  reserved_count: number;
};
type AdminCredit = {
  id: number;
  user_id: number;
  user_name: string;
  class_type_id: number | null;
  class_type_name: string | null;
  granted_at: string;
  expires_at: string | null;
  status: string;
  source: string;
  note: string | null;
  created_by: string | null;
};
type AdminReservation = {
  id: number;
  user_id: number;
  user_name: string;
  event_id: number;
  starts_at: string;
  class_type_name: string;
  reservation_type: string;
  makeup_credit_id: number | null;
  status: string;
  created_at: string;
  canceled_at: string | null;
};

type Tab = "classTypes" | "events" | "credits" | "reservations";

// --- スタイル定数 ---
const card: React.CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "12px",
  backgroundColor: "#fff",
};
const label: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "#374151",
  marginBottom: "2px",
};
const input: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  fontSize: "13px",
  boxSizing: "border-box",
};
const btn = (color = "#3b82f6", disabled = false): React.CSSProperties => ({
  fontSize: "12px",
  padding: "6px 14px",
  borderRadius: "6px",
  border: "none",
  backgroundColor: disabled ? "#d1d5db" : color,
  color: disabled ? "#9ca3af" : "#fff",
  cursor: disabled ? "not-allowed" : "pointer",
  fontWeight: 600,
  opacity: disabled ? 0.6 : 1,
});
const tabStyle = (active: boolean): React.CSSProperties => ({
  fontSize: "14px",
  padding: "8px 16px",
  borderRadius: "8px 8px 0 0",
  border: active ? "1px solid #e5e7eb" : "1px solid transparent",
  borderBottom: active ? "1px solid #fff" : "1px solid #e5e7eb",
  backgroundColor: active ? "#fff" : "#f9fafb",
  cursor: "pointer",
  fontWeight: active ? 700 : 400,
  marginRight: "4px",
});

const TAB_KEYS: Tab[] = ["classTypes", "events", "credits", "reservations"];

function parseTab(value: string | null): Tab {
  if (value && TAB_KEYS.includes(value as Tab)) return value as Tab;
  return "classTypes";
}

export default function AdminPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = parseTab(searchParams.get("tab"));

  const [tab, setTabState] = useState<Tab>(tabFromUrl);
  const [classTypes, setClassTypes] = useState<ClassType[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // URL と同期（リロード時や直接 /admin?tab=events で開いた時）
  useEffect(() => {
    setTabState(tabFromUrl);
  }, [tabFromUrl]);

  const setTab = useCallback(
    (next: Tab) => {
      setTabState(next);
      const url = next === "classTypes" ? "/admin/reservations" : `/admin/reservations?tab=${next}`;
      router.replace(url, { scroll: false });
    },
    [router],
  );

  const loadClassTypes = useCallback(() => {
    fetch(`${API_BASE}/admin/class-types`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setClassTypes(Array.isArray(d) ? d : []))
      .catch(() => setClassTypes([]));
  }, []);

  // load master data (APIがエラーでも配列として安全に扱う)
  useEffect(() => {
    loadClassTypes();
    fetch(`${API_BASE}/admin/users`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch(() => setUsers([]));
  }, [loadClassTypes]);

  const flash = (m: string) => { setMsg(m); setErr(null); setTimeout(() => setMsg(null), 3000); };
  const flashErr = (m: string) => { setErr(m); setMsg(null); setTimeout(() => setErr(null), 5000); };

  return (
    <>
      {msg && <div style={{ padding: "8px 12px", borderRadius: "4px", backgroundColor: "#ecfdf5", color: "#065f46", marginBottom: "12px", fontSize: "13px" }}>{msg}</div>}
      {err && <div style={{ padding: "8px 12px", borderRadius: "4px", backgroundColor: "#fee2e2", color: "#991b1b", marginBottom: "12px", fontSize: "13px" }}>{err}</div>}

      <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", marginBottom: "16px", flexWrap: "wrap" }}>
        <button type="button" style={tabStyle(tab === "classTypes")} onClick={() => setTab("classTypes")}>クラス種別管理</button>
        <button type="button" style={tabStyle(tab === "events")} onClick={() => setTab("events")}>イベント / 休講管理</button>
        <button type="button" style={tabStyle(tab === "credits")} onClick={() => setTab("credits")}>振替権利管理</button>
        <button type="button" style={tabStyle(tab === "reservations")} onClick={() => setTab("reservations")}>予約管理 / 代理操作</button>
      </div>

      {tab === "classTypes" && <ClassTypesTab classTypes={classTypes} reload={loadClassTypes} flash={flash} flashErr={flashErr} />}
      {tab === "events" && <EventsTab classTypes={classTypes} flash={flash} flashErr={flashErr} />}
      {tab === "credits" && <CreditsTab classTypes={classTypes} users={users} flash={flash} flashErr={flashErr} />}
      {tab === "reservations" && <ReservationsTab users={users} flash={flash} flashErr={flashErr} />}
    </>
  );
}

// ================================================================
// イベント / 休講管理
// ================================================================
function EventsTab({ classTypes, flash, flashErr }: { classTypes: ClassType[]; flash: (m: string) => void; flashErr: (m: string) => void }) {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10);
  });

  // new event form
  const [newClassType, setNewClassType] = useState<number | "">("");
  const [newStartsAt, setNewStartsAt] = useState("");
  const [newEndsAt, setNewEndsAt] = useState("");
  const [newCapacity, setNewCapacity] = useState(6);

  // 選択（まとめ操作用）
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkCapacityValue, setBulkCapacityValue] = useState(6);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(events.map((e) => e.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // イベント編集モーダル
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);
  const [editEvStart, setEditEvStart] = useState("");
  const [editEvEnd, setEditEvEnd] = useState("");
  const [editEvCapacity, setEditEvCapacity] = useState(6);
  const [editEvStatus, setEditEvStatus] = useState("scheduled");

  const openEditModal = (ev: AdminEvent) => {
    setEditEvent(ev);
    setEditEvStart(ev.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvEnd(ev.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEvCapacity(ev.capacity);
    setEditEvStatus(ev.status);
  };

  const saveEditEvent = async () => {
    if (!editEvent) return;
    try {
      // 時間変更
      await fetch(`${API_BASE}/admin/events/${editEvent.id}/time`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startsAt: editEvStart.replace("T", " "), endsAt: editEvEnd.replace("T", " ") }),
      });
      // 定員変更
      await fetch(`${API_BASE}/admin/events/${editEvent.id}/capacity`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capacity: editEvCapacity }),
      });
      // ステータス変更
      if (editEvStatus !== editEvent.status) {
        await fetch(`${API_BASE}/admin/events/${editEvent.id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: editEvStatus }),
        });
      }
      flash(`イベント #${editEvent.id} を更新しました`);
      setEditEvent(null);
      loadEvents();
    } catch {
      flashErr("更新に失敗しました");
    }
  };

  const deleteFromEditModal = () => {
    if (!editEvent) return;
    setEditEvent(null);
    handleDeleteEvent(editEvent.id);
  };

  // 確認モーダル状態
  const [modal, setModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    confirmColor: string;
    action: () => Promise<void>;
  } | null>(null);

  const openModal = (title: string, message: string, action: () => Promise<void>, confirmLabel = "実行", confirmColor = "#3b82f6") => {
    setModal({ title, message, confirmLabel, confirmColor, action });
  };

  const execModal = async () => {
    if (!modal) return;
    await modal.action();
    setModal(null);
  };

  const requestBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "まとめて削除",
      `${ids.length} 件のイベントを削除します。この操作は取り消せません。`,
      async () => {
        const res = await fetch(`${API_BASE}/admin/events/bulk-delete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) { flashErr((await res.json()).error); return; }
        const data = await res.json();
        flash(`${data.deleted} 件のイベントを削除しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
      "削除する",
      "#991b1b",
    );
  };

  const requestBulkStatus = (status: string) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    const statusLabel = status === "scheduled" ? "開催" : status === "holiday" ? "通常休み" : "休講";
    openModal(
      "ステータス一括変更",
      `${ids.length} 件のイベントを「${statusLabel}」に変更します。`,
      async () => {
        const res = await fetch(`${API_BASE}/admin/events/bulk-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, status }),
        });
        if (!res.ok) { flashErr((await res.json()).error); return; }
        const data = await res.json();
        flash(`${data.updated} 件を ${statusLabel} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  const requestBulkCapacity = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "定員一括変更",
      `${ids.length} 件のイベントの定員を ${bulkCapacityValue} 人に変更します。`,
      async () => {
        const res = await fetch(`${API_BASE}/admin/events/bulk-capacity`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, capacity: bulkCapacityValue }),
        });
        if (!res.ok) { flashErr((await res.json()).error); return; }
        const data = await res.json();
        flash(`${data.updated} 件の定員を ${data.capacity} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  // bulk time change
  const [bulkEditStartTime, setBulkEditStartTime] = useState("16:00");
  const [bulkEditEndTime, setBulkEditEndTime] = useState("17:00");

  const requestBulkTime = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) { flashErr("イベントを選択してください"); return; }
    openModal(
      "時間一括変更",
      `${ids.length} 件のイベントの時間を ${bulkEditStartTime} ～ ${bulkEditEndTime} に変更します。（日付はそのまま）`,
      async () => {
        const res = await fetch(`${API_BASE}/admin/events/bulk-time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, startTime: bulkEditStartTime, endTime: bulkEditEndTime }),
        });
        if (!res.ok) { flashErr((await res.json()).error); return; }
        const data = await res.json();
        flash(`${data.updated} 件の時間を ${data.startTime}～${data.endTime} に変更しました`);
        setSelectedIds(new Set());
        loadEvents();
      },
    );
  };

  // bulk create form
  const [bulkClassType, setBulkClassType] = useState<number | "">("");
  const [bulkStartTime, setBulkStartTime] = useState("16:00");
  const [bulkEndTime, setBulkEndTime] = useState("17:00");
  const [bulkCapacity, setBulkCapacity] = useState(6);
  const [bulkWeekdays, setBulkWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]); // 月〜土（日曜以外）
  const [bulkDateFrom, setBulkDateFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [bulkDateTo, setBulkDateTo] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().slice(0, 10);
  });
  const [bulkExclude, setBulkExclude] = useState("");

  const loadEvents = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/events?from=${from}&to=${to}`);
      const data = res.ok ? await res.json() : [];
      setEvents(Array.isArray(data) ? data : []);
    } catch { flashErr("イベント読み込み失敗"); }
  }, [from, to, flashErr]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const handleCreateEvent = async () => {
    if (!newClassType || !newStartsAt || !newEndsAt) { flashErr("入力を埋めてください"); return; }
    const res = await fetch(`${API_BASE}/admin/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classTypeId: newClassType, startsAt: newStartsAt, endsAt: newEndsAt, capacity: newCapacity }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash("イベントを作成しました"); setNewClassType(""); setNewStartsAt(""); setNewEndsAt(""); loadEvents();
  };

  const handleBulkCreate = async () => {
    if (!bulkClassType) { flashErr("クラス種別を選択してください"); return; }
    if (bulkWeekdays.length === 0) { flashErr("曜日を1つ以上選択してください"); return; }
    const excludeDates = bulkExclude
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const res = await fetch(`${API_BASE}/admin/events/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classTypeId: bulkClassType,
        startTime: bulkStartTime,
        endTime: bulkEndTime,
        capacity: bulkCapacity,
        weekdays: bulkWeekdays,
        dateFrom: bulkDateFrom,
        dateTo: bulkDateTo,
        excludeDates,
      }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    const data = await res.json();
    flash(`${data.count} 件のイベントをまとめて作成しました`);
    loadEvents();
  };

  const toggleWeekday = (day: number) => {
    setBulkWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort(),
    );
  };

  const handleStatusChange = async (id: number, status: string) => {
    const res = await fetch(`${API_BASE}/admin/events/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`イベント#${id} → ${status}`); loadEvents();
  };

  const handleCapacityChange = async (id: number, capacity: number) => {
    const res = await fetch(`${API_BASE}/admin/events/${id}/capacity`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capacity }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`イベント#${id} 定員 → ${capacity}`); loadEvents();
  };

  const handleTimeChange = async (id: number, startsAt: string, endsAt: string) => {
    const res = await fetch(`${API_BASE}/admin/events/${id}/time`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startsAt, endsAt }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`イベント #${id} の時間を変更しました`); loadEvents();
  };

  // 編集中のイベント時間
  const [editTimeId, setEditTimeId] = useState<number | null>(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");

  const startTimeEdit = (ev: AdminEvent) => {
    setEditTimeId(ev.id);
    // datetime-local用: "YYYY-MM-DDTHH:MM"
    setEditStart(ev.starts_at?.slice(0, 16)?.replace(" ", "T") ?? "");
    setEditEnd(ev.ends_at?.slice(0, 16)?.replace(" ", "T") ?? "");
  };

  const cancelTimeEdit = () => { setEditTimeId(null); };

  const saveTimeEdit = async () => {
    if (!editTimeId || !editStart || !editEnd) return;
    await handleTimeChange(editTimeId, editStart.replace("T", " "), editEnd.replace("T", " "));
    setEditTimeId(null);
  };

  const handleDeleteEvent = (id: number) => {
    openModal(
      "イベント削除",
      `イベント #${id} を削除します。この操作は取り消せません。`,
      async () => {
        const res = await fetch(`${API_BASE}/admin/events/${id}`, { method: "DELETE" });
        if (!res.ok) { flashErr((await res.json()).error); return; }
        flash(`イベント #${id} を削除しました`); loadEvents();
      },
      "削除する",
      "#991b1b",
    );
  };

  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  // カレンダーのクリックモード: "edit" = クリックで編集モーダル, "select" = クリックでチェック選択
  const [calClickMode, setCalClickMode] = useState<"edit" | "select">("edit");

  // カレンダー用: 月の状態
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const toDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const calGrid = (() => {
    const startOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const endOfMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0);
    const gridStartTmp = new Date(startOfMonth);
    gridStartTmp.setDate(gridStartTmp.getDate() - gridStartTmp.getDay());
    const gridEndTmp = new Date(endOfMonth);
    gridEndTmp.setDate(gridEndTmp.getDate() + (6 - gridEndTmp.getDay()));
    const dates: string[] = [];
    const cursor = new Date(gridStartTmp);
    while (cursor <= gridEndTmp) {
      dates.push(toDateStr(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  })();

  const eventsByDate = (() => {
    const map = new Map<string, AdminEvent[]>();
    for (const ev of events) {
      const dateKey = (ev.starts_at ?? "").slice(0, 10);
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(ev);
    }
    return map;
  })();

  const statusColor = (s: string) => s === "scheduled" ? "#059669" : s === "holiday" ? "#6b7280" : "#dc2626";
  const statusLabel = (s: string) => s === "scheduled" ? "開催" : s === "holiday" ? "休み" : "休講";

  return (
    <div>
      <ConfirmModal
        open={modal !== null}
        title={modal?.title ?? ""}
        onConfirm={execModal}
        onCancel={() => setModal(null)}
        confirmLabel={modal?.confirmLabel ?? "実行"}
        confirmColor={modal?.confirmColor ?? "#3b82f6"}
      >
        {modal?.message}
      </ConfirmModal>

      {/* イベント編集モーダル */}
      {editEvent && (
        <div
          style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, animation: "fadeIn 0.2s ease" }}
          onClick={() => setEditEvent(null)}
        >
          <div
            style={{ backgroundColor: "#fff", borderRadius: "12px", padding: "24px", minWidth: "420px", maxWidth: "520px", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", animation: "slideUp 0.25s ease" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
              イベント編集（#{editEvent.id}）
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: "10px 12px", alignItems: "center", fontSize: "13px", marginBottom: "16px" }}>
              <span style={label}>クラス</span>
              <span style={{ fontWeight: 600 }}>{editEvent.class_type_name}</span>

              <span style={label}>開始日時</span>
              <input type="datetime-local" style={input} value={editEvStart} onChange={(e) => setEditEvStart(e.target.value)} />

              <span style={label}>終了日時</span>
              <input type="datetime-local" style={input} value={editEvEnd} onChange={(e) => setEditEvEnd(e.target.value)} />

              <span style={label}>定員</span>
              <input type="number" min={0} style={{ ...input, width: "80px" }} value={editEvCapacity} onChange={(e) => setEditEvCapacity(Number(e.target.value))} />

              <span style={label}>ステータス</span>
              <div style={{ display: "flex", gap: "6px" }}>
                {([["scheduled", "開催", "#059669"], ["holiday", "通常休み", "#6b7280"], ["canceled_by_admin", "休講", "#dc2626"]] as const).map(([val, lbl, color]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setEditEvStatus(val)}
                    style={{
                      fontSize: "12px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      border: editEvStatus === val ? `2px solid ${color}` : "1px solid #d1d5db",
                      backgroundColor: editEvStatus === val ? (val === "scheduled" ? "#d1fae5" : val === "holiday" ? "#e5e7eb" : "#fee2e2") : "#fff",
                      color: editEvStatus === val ? color : "#6b7280",
                      fontWeight: editEvStatus === val ? 700 : 400,
                      cursor: "pointer",
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <span style={label}>予約数</span>
              <span>{editEvent.reserved_count} / {editEvCapacity}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={deleteFromEditModal}
                style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "none", backgroundColor: "#991b1b", color: "#fff", cursor: "pointer", fontWeight: 600 }}
              >
                削除
              </button>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setEditEvent(null)}
                  style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#fff", cursor: "pointer" }}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={saveEditEvent}
                  style={{ fontSize: "13px", padding: "6px 16px", borderRadius: "6px", border: "none", backgroundColor: "#3b82f6", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新規イベント作成 */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>新規イベント作成</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 80px auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span style={label}>クラス種別</span>
            <select style={input} value={newClassType} onChange={(e) => setNewClassType(Number(e.target.value) || "")}>
              <option value="">選択</option>
              {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>開始日時</span>
            <input type="datetime-local" style={input} value={newStartsAt} onChange={(e) => setNewStartsAt(e.target.value)} />
          </div>
          <div>
            <span style={label}>終了日時</span>
            <input type="datetime-local" style={input} value={newEndsAt} onChange={(e) => setNewEndsAt(e.target.value)} />
          </div>
          <div>
            <span style={label}>定員</span>
            <input type="number" style={input} value={newCapacity} onChange={(e) => setNewCapacity(Number(e.target.value))} min={1} />
          </div>
          <button type="button" style={btn()} onClick={handleCreateEvent}>作成</button>
        </div>
      </div>

      {/* まとめイベント登録 */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>まとめイベント登録（曜日×期間で一括作成）</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 70px", gap: "8px", alignItems: "end", marginBottom: "8px" }}>
          <div>
            <span style={label}>クラス種別</span>
            <select style={input} value={bulkClassType} onChange={(e) => setBulkClassType(Number(e.target.value) || "")}>
              <option value="">選択</option>
              {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>開始時刻</span>
            <input type="time" style={input} value={bulkStartTime} onChange={(e) => setBulkStartTime(e.target.value)} />
          </div>
          <div>
            <span style={label}>終了時刻</span>
            <input type="time" style={input} value={bulkEndTime} onChange={(e) => setBulkEndTime(e.target.value)} />
          </div>
          <div>
            <span style={label}>定員</span>
            <input type="number" style={input} value={bulkCapacity} onChange={(e) => setBulkCapacity(Number(e.target.value))} min={1} />
          </div>
        </div>

        <div style={{ marginBottom: "8px" }}>
          <span style={label}>曜日（開催する曜日をチェック）</span>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
            {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
              <label
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "3px",
                  fontSize: "13px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: bulkWeekdays.includes(i) ? "2px solid #3b82f6" : "1px solid #d1d5db",
                  backgroundColor: bulkWeekdays.includes(i) ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={bulkWeekdays.includes(i)}
                  onChange={() => toggleWeekday(i)}
                  style={{ display: "none" }}
                />
                {w}
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span style={label}>開始日</span>
            <input type="date" style={input} value={bulkDateFrom} onChange={(e) => setBulkDateFrom(e.target.value)} />
          </div>
          <div>
            <span style={label}>終了日</span>
            <input type="date" style={input} value={bulkDateTo} onChange={(e) => setBulkDateTo(e.target.value)} />
          </div>
          <div>
            <span style={label}>除外日（カンマ区切り）</span>
            <input type="text" style={input} value={bulkExclude} onChange={(e) => setBulkExclude(e.target.value)} placeholder="2026-03-21, 2026-05-05" />
          </div>
          <button type="button" style={btn("#059669")} onClick={handleBulkCreate}>まとめて作成</button>
        </div>
      </div>

      {/* 表示切替 + 期間フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
        <button type="button" style={{ ...btn(viewMode === "calendar" ? "#3b82f6" : "#9ca3af"), fontSize: "12px" }} onClick={() => setViewMode("calendar")}>カレンダー</button>
        <button type="button" style={{ ...btn(viewMode === "table" ? "#3b82f6" : "#9ca3af"), fontSize: "12px" }} onClick={() => setViewMode("table")}>テーブル</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 4px" }} />
        <span style={{ fontSize: "13px" }}>期間:</span>
        <input type="date" style={{ ...input, width: "150px" }} value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>〜</span>
        <input type="date" style={{ ...input, width: "150px" }} value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" style={btn()} onClick={loadEvents}>検索</button>
      </div>

      {/* カレンダー時のモード切替 */}
      {viewMode === "calendar" && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          <button
            type="button"
            onClick={() => { setCalClickMode("edit"); deselectAll(); }}
            style={{
              fontSize: "12px",
              padding: "5px 14px",
              borderRadius: "6px",
              border: calClickMode === "edit" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              backgroundColor: calClickMode === "edit" ? "#eff6ff" : "#fff",
              color: calClickMode === "edit" ? "#1d4ed8" : "#374151",
              fontWeight: calClickMode === "edit" ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            編集モード（クリックで編集）
          </button>
          <button
            type="button"
            onClick={() => setCalClickMode("select")}
            style={{
              fontSize: "12px",
              padding: "5px 14px",
              borderRadius: "6px",
              border: calClickMode === "select" ? "2px solid #3b82f6" : "1px solid #d1d5db",
              backgroundColor: calClickMode === "select" ? "#eff6ff" : "#fff",
              color: calClickMode === "select" ? "#1d4ed8" : "#374151",
              fontWeight: calClickMode === "select" ? 700 : 400,
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            選択モード（まとめて操作）
          </button>
        </div>
      )}

      {/* まとめ操作バー（テーブル時は常時、カレンダー時は選択モードのみ） */}
      {(() => {
        const show = viewMode === "table" || calClickMode === "select";
        return (
      <div style={{
        ...card,
        display: "flex",
        gap: "8px",
        alignItems: "center",
        flexWrap: "wrap",
        padding: show ? "10px 14px" : "0 14px",
        maxHeight: show ? "200px" : "0",
        opacity: show ? 1 : 0,
        overflow: "hidden",
        transition: "max-height 0.35s ease, opacity 0.3s ease, padding 0.3s ease, margin 0.3s ease",
        marginBottom: show ? "12px" : "0",
        border: show ? "1px solid #e5e7eb" : "1px solid transparent",
      }}>
        <span style={{ fontSize: "13px", fontWeight: 600 }}>まとめ操作</span>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>（{selectedIds.size} 件選択中）</span>
        <button type="button" style={{ ...btn("#6b7280"), fontSize: "11px" }} onClick={selectAll}>全選択</button>
        <button type="button" style={{ ...btn("#6b7280"), fontSize: "11px" }} onClick={deselectAll}>選択解除</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 2px" }} />
        {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
          <button
            key={w}
            type="button"
            style={{
              fontSize: "11px",
              padding: "3px 8px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
              color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#374151",
              fontWeight: 600,
            }}
            onClick={() => {
              const ids = events
                .filter((ev) => new Date(ev.starts_at).getDay() === i)
                .map((ev) => ev.id);
              setSelectedIds((prev) => {
                const next = new Set(prev);
                const allSelected = ids.every((id) => next.has(id));
                if (allSelected) {
                  ids.forEach((id) => next.delete(id));
                } else {
                  ids.forEach((id) => next.add(id));
                }
                return next;
              });
            }}
          >
            {w}曜
          </button>
        ))}
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 2px" }} />
        <button type="button" style={{ ...btn("#059669"), fontSize: "11px" }} onClick={() => requestBulkStatus("scheduled")}>開催に</button>
        <button type="button" style={{ ...btn("#6b7280"), fontSize: "11px" }} onClick={() => requestBulkStatus("holiday")}>通常休みに</button>
        <button type="button" style={{ ...btn("#dc2626"), fontSize: "11px" }} onClick={() => requestBulkStatus("canceled_by_admin")}>休講に</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 2px" }} />
        <span style={{ fontSize: "12px" }}>定員:</span>
        <input type="number" min={0} value={bulkCapacityValue} onChange={(e) => setBulkCapacityValue(Number(e.target.value))} style={{ ...input, width: "60px" }} />
        <button type="button" style={{ ...btn("#3b82f6"), fontSize: "11px" }} onClick={requestBulkCapacity}>定員変更</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 2px" }} />
        <span style={{ fontSize: "12px" }}>時間:</span>
        <input type="time" value={bulkEditStartTime} onChange={(e) => setBulkEditStartTime(e.target.value)} style={{ ...input, width: "90px" }} />
        <span>～</span>
        <input type="time" value={bulkEditEndTime} onChange={(e) => setBulkEditEndTime(e.target.value)} style={{ ...input, width: "90px" }} />
        <button type="button" style={{ ...btn("#3b82f6"), fontSize: "11px" }} onClick={requestBulkTime}>時間変更</button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 2px" }} />
        <button type="button" style={{ ...btn("#991b1b"), fontSize: "11px" }} onClick={requestBulkDelete}>まとめて削除</button>
      </div>
        );
      })()}

      {/* カレンダー表示 */}
      {viewMode === "calendar" && (
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
            <button type="button" style={{ ...btn("#6b7280"), fontSize: "12px" }} onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() - 1, 1))}>◀ 前月</button>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>{calMonth.getFullYear()}年 {calMonth.getMonth() + 1}月</span>
            <button type="button" style={{ ...btn("#6b7280"), fontSize: "12px" }} onClick={() => setCalMonth((p) => new Date(p.getFullYear(), p.getMonth() + 1, 1))}>次月 ▶</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", tableLayout: "fixed" } as any}>
            {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
              <div key={w} style={{ textAlign: "center", fontSize: "12px", fontWeight: 600, color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#6b7280", paddingBottom: "4px" }}>{w}</div>
            ))}
            {calGrid.map((date) => {
              const d = new Date(date);
              const dayOfWeek = d.getDay();
              const isCurrentMonth = d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear();
              const list = eventsByDate.get(date) ?? [];
              const todayNow = new Date(); todayNow.setHours(0,0,0,0);
              const isToday = d.getFullYear() === todayNow.getFullYear() && d.getMonth() === todayNow.getMonth() && d.getDate() === todayNow.getDate();

              return (
                <div
                  key={date}
                  style={{
                    borderRadius: "6px",
                    border: isToday ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    padding: "4px 6px",
                    minHeight: "120px",
                    backgroundColor: "#fff",
                    opacity: isCurrentMonth ? 1 : 0.4,
                    overflow: "hidden",
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: "13px", color: dayOfWeek === 0 ? "#dc2626" : dayOfWeek === 6 ? "#2563eb" : "#374151", marginBottom: "4px" }}>
                    {d.getDate()}
                  </div>
                  {list.length === 0 && (
                    <div style={{ fontSize: "10px", color: "#d1d5db" }}>—</div>
                  )}
                  {list.map((ev) => (
                    <div
                      key={ev.id}
                      style={{
                        fontSize: "12px",
                        padding: "5px 7px",
                        borderRadius: "6px",
                        marginBottom: "4px",
                        backgroundColor: selectedIds.has(ev.id) ? "#dbeafe" : ev.status === "scheduled" ? "#ecfdf5" : ev.status === "holiday" ? "#f3f4f6" : "#fee2e2",
                        border: selectedIds.has(ev.id) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        cursor: "pointer",
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                      onClick={() => calClickMode === "select" ? toggleSelect(ev.id) : openEditModal(ev)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                        {calClickMode === "select" && (
                          <input
                            type="checkbox"
                            checked={selectedIds.has(ev.id)}
                            onChange={() => toggleSelect(ev.id)}
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: "14px", height: "14px", flexShrink: 0 }}
                          />
                        )}
                        <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>{(ev.starts_at ?? "").slice(11, 16)}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, fontWeight: 500 }}>{ev.class_type_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", paddingLeft: calClickMode === "select" ? "19px" : "0" }}>
                        <span style={{
                          padding: "1px 6px",
                          borderRadius: "4px",
                          fontSize: "10px",
                          fontWeight: 700,
                          color: ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                          backgroundColor: ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                        }}>
                          {ev.status === "scheduled" ? "開催" : ev.status === "holiday" ? "休み" : "休講"}
                        </span>
                        <span style={{ color: "#6b7280", fontSize: "11px" }}>{ev.reserved_count}/{ev.capacity}人</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* テーブル表示 */}
      {viewMode === "table" && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb", width: "30px" }}>
                <input type="checkbox" checked={selectedIds.size === events.length && events.length > 0} onChange={() => selectedIds.size === events.length ? deselectAll() : selectAll()} />
              </th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ID</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>クラス</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>日時</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>定員</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>予約数</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ステータス</th>
              <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => (
              <tr key={ev.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: selectedIds.has(ev.id) ? "#eff6ff" : undefined }}>
                <td style={{ padding: "6px 8px" }}>
                  <input type="checkbox" checked={selectedIds.has(ev.id)} onChange={() => toggleSelect(ev.id)} />
                </td>
                <td style={{ padding: "6px 8px" }}>{ev.id}</td>
                <td style={{ padding: "6px 8px" }}>{ev.class_type_name}</td>
                <td style={{ padding: "6px 8px" }}>
                  {editTimeId === ev.id ? (
                    <div style={{ display: "flex", gap: "4px", alignItems: "center", flexWrap: "wrap" }}>
                      <input type="datetime-local" style={{ ...input, width: "170px", fontSize: "12px" }} value={editStart} onChange={(e) => setEditStart(e.target.value)} />
                      <span>～</span>
                      <input type="datetime-local" style={{ ...input, width: "170px", fontSize: "12px" }} value={editEnd} onChange={(e) => setEditEnd(e.target.value)} />
                      <button type="button" style={btn("#059669")} onClick={saveTimeEdit}>保存</button>
                      <button type="button" style={btn("#6b7280")} onClick={cancelTimeEdit}>取消</button>
                    </div>
                  ) : (
                    <span style={{ cursor: "pointer" }} onClick={() => startTimeEdit(ev)} title="クリックで時間を編集">
                      {(() => {
                        const d = new Date(ev.starts_at);
                        const e = new Date(ev.ends_at);
                        const w = "日月火水木金土"[d.getDay()];
                        const color = d.getDay() === 0 ? "#dc2626" : d.getDay() === 6 ? "#2563eb" : "#6b7280";
                        const fmt = (dt: Date) => `${dt.getHours()}:${String(dt.getMinutes()).padStart(2, "0")}`;
                        return (
                          <>
                            {d.getFullYear()}年{d.getMonth() + 1}月{d.getDate()}日
                            <span style={{ color, fontWeight: 600 }}>({w})</span>
                            {fmt(d)} ～ {fmt(e)}
                            <span style={{ marginLeft: "4px", fontSize: "10px", color: "#9ca3af" }}>✏️</span>
                          </>
                        );
                      })()}
                    </span>
                  )}
                </td>
                <td style={{ padding: "6px 8px" }}>
                  <input
                    type="number"
                    min={0}
                    defaultValue={ev.capacity}
                    style={{ width: "50px", ...input }}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v !== ev.capacity) handleCapacityChange(ev.id, v);
                    }}
                  />
                </td>
                <td style={{ padding: "6px 8px" }}>{ev.reserved_count}</td>
                <td style={{ padding: "6px 8px" }}>
                  <span style={{
                    display: "inline-block",
                    padding: "3px 10px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                    backgroundColor: ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                    border: ev.status === "scheduled" ? "1px solid #6ee7b7" : ev.status === "holiday" ? "1px solid #d1d5db" : "1px solid #fca5a5",
                  }}>
                    {ev.status === "scheduled" ? "● 開催" : ev.status === "holiday" ? "■ 通常休み" : "▲ 休講"}
                  </span>
                </td>
                <td style={{ padding: "6px 8px", display: "flex", gap: "4px", flexWrap: "wrap" }}>
                  <button type="button" disabled={ev.status === "scheduled"} style={btn("#059669", ev.status === "scheduled")} onClick={() => handleStatusChange(ev.id, "scheduled")}>
                    開催に戻す
                  </button>
                  <button type="button" disabled={ev.status === "holiday"} style={btn("#6b7280", ev.status === "holiday")} onClick={() => handleStatusChange(ev.id, "holiday")}>
                    通常休みに
                  </button>
                  <button type="button" disabled={ev.status === "canceled_by_admin"} style={btn("#dc2626", ev.status === "canceled_by_admin")} onClick={() => handleStatusChange(ev.id, "canceled_by_admin")}>
                    休講に
                  </button>
                  <button type="button" style={btn("#991b1b")} onClick={() => handleDeleteEvent(ev.id)}>
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {events.length === 0 && (
              <tr><td colSpan={8} style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>イベントがありません</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ================================================================
// 振替権利管理
// ================================================================
function CreditsTab({ classTypes, users, flash, flashErr }: { classTypes: ClassType[]; users: User[]; flash: (m: string) => void; flashErr: (m: string) => void }) {
  const [credits, setCredits] = useState<AdminCredit[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | "">("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // grant form
  const [grantUserId, setGrantUserId] = useState<number | "">("");
  const [grantClassType, setGrantClassType] = useState<number | "">("");
  const [grantExpires, setGrantExpires] = useState("");
  const [grantNote, setGrantNote] = useState("");

  const loadCredits = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.set("userId", String(filterUserId));
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`${API_BASE}/admin/makeup-credits?${params.toString()}`);
      const data = res.ok ? await res.json() : [];
      setCredits(Array.isArray(data) ? data : []);
    } catch { flashErr("振替権利読み込み失敗"); }
  }, [filterUserId, filterStatus, flashErr]);

  useEffect(() => { loadCredits(); }, [loadCredits]);

  const handleGrant = async () => {
    if (!grantUserId) { flashErr("ユーザーを選択してください"); return; }
    const res = await fetch(`${API_BASE}/admin/makeup-credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: grantUserId,
        classTypeId: grantClassType || null,
        expiresAt: grantExpires || null,
        note: grantNote || null,
        createdBy: "admin",
      }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash("振替権利を付与しました"); setGrantUserId(""); setGrantClassType(""); setGrantExpires(""); setGrantNote(""); loadCredits();
  };

  const handleRevoke = async (id: number) => {
    if (!confirm(`振替権利 #${id} を取消しますか？`)) return;
    const res = await fetch(`${API_BASE}/admin/makeup-credits/${id}`, { method: "DELETE" });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`振替権利 #${id} を取消しました`); loadCredits();
  };

  const handleRestore = async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/makeup-credits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "granted" }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`振替権利 #${id} を復活しました`); loadCredits();
  };

  const handleUpdateExpiry = async (id: number, newExpiry: string) => {
    const res = await fetch(`${API_BASE}/admin/makeup-credits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresAt: newExpiry || null }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`振替権利 #${id} の期限を変更しました`); loadCredits();
  };

  return (
    <div>
      {/* 手動付与フォーム */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>振替権利の手動付与</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span style={label}>ユーザー</span>
            <select style={input} value={grantUserId} onChange={(e) => setGrantUserId(Number(e.target.value) || "")}>
              <option value="">選択</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} (ID:{u.id})</option>)}
            </select>
          </div>
          <div>
            <span style={label}>クラス種別（任意）</span>
            <select style={input} value={grantClassType} onChange={(e) => setGrantClassType(Number(e.target.value) || "")}>
              <option value="">制限なし</option>
              {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>有効期限（任意）</span>
            <input type="date" style={input} value={grantExpires} onChange={(e) => setGrantExpires(e.target.value)} />
          </div>
          <div>
            <span style={label}>備考</span>
            <input type="text" style={input} value={grantNote} onChange={(e) => setGrantNote(e.target.value)} placeholder="救済付与など" />
          </div>
          <button type="button" style={btn()} onClick={handleGrant}>付与</button>
        </div>
      </div>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <select style={{ ...input, width: "180px" }} value={filterUserId} onChange={(e) => setFilterUserId(Number(e.target.value) || "")}>
          <option value="">全ユーザー</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select style={{ ...input, width: "140px" }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="">全ステータス</option>
          <option value="granted">granted</option>
          <option value="consumed">consumed</option>
          <option value="revoked">revoked</option>
        </select>
        <button type="button" style={btn()} onClick={loadCredits}>検索</button>
      </div>

      {/* 一覧 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ID</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ユーザー</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>クラス</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>付与日</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>有効期限</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ステータス</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>由来</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>備考</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {credits.map((c) => (
            <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 8px" }}>{c.id}</td>
              <td style={{ padding: "6px 8px" }}>{c.user_name} (ID:{c.user_id})</td>
              <td style={{ padding: "6px 8px" }}>{c.class_type_name ?? "制限なし"}</td>
              <td style={{ padding: "6px 8px" }}>{c.granted_at?.slice(0, 10)}</td>
              <td style={{ padding: "6px 8px" }}>
                <input
                  type="date"
                  defaultValue={c.expires_at?.slice(0, 10) ?? ""}
                  style={{ ...input, width: "130px" }}
                  onBlur={(e) => {
                    const v = e.target.value;
                    const old = c.expires_at?.slice(0, 10) ?? "";
                    if (v !== old) handleUpdateExpiry(c.id, v);
                  }}
                />
              </td>
              <td style={{ padding: "6px 8px", fontWeight: 600, color: c.status === "granted" ? "#059669" : c.status === "revoked" ? "#dc2626" : "#6b7280" }}>
                {c.status}
              </td>
              <td style={{ padding: "6px 8px" }}>{c.source}</td>
              <td style={{ padding: "6px 8px", fontSize: "12px" }}>{c.note}</td>
              <td style={{ padding: "6px 8px", display: "flex", gap: "4px" }}>
                {c.status === "granted" && (
                  <button type="button" style={btn("#dc2626")} onClick={() => handleRevoke(c.id)}>取消</button>
                )}
                {(c.status === "revoked" || c.status === "consumed") && (
                  <button type="button" style={btn("#059669")} onClick={() => handleRestore(c.id)}>復活</button>
                )}
              </td>
            </tr>
          ))}
          {credits.length === 0 && (
            <tr><td colSpan={9} style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>振替権利がありません</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// 予約管理 / 代理操作
// ================================================================
function ReservationsTab({ users, flash, flashErr }: { users: User[]; flash: (m: string) => void; flashErr: (m: string) => void }) {
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [filterUserId, setFilterUserId] = useState<number | "">("");
  const [filterEventId, setFilterEventId] = useState<number | "">("");

  // proxy reservation form
  const [proxyUserId, setProxyUserId] = useState<number | "">("");
  const [proxyEventId, setProxyEventId] = useState<number | "">("");
  const [proxyType, setProxyType] = useState<"normal" | "makeup">("normal");
  const [proxyCreditId, setProxyCreditId] = useState<number | "">("");
  const [proxyOverride, setProxyOverride] = useState(false);

  const loadReservations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterUserId) params.set("userId", String(filterUserId));
      if (filterEventId) params.set("eventId", String(filterEventId));
      const res = await fetch(`${API_BASE}/admin/reservations?${params.toString()}`);
      const data = res.ok ? await res.json() : [];
      setReservations(Array.isArray(data) ? data : []);
    } catch { flashErr("予約読み込み失敗"); }
  }, [filterUserId, filterEventId, flashErr]);

  useEffect(() => { loadReservations(); }, [loadReservations]);

  const handleProxyReservation = async () => {
    if (!proxyUserId || !proxyEventId) { flashErr("ユーザーとイベントIDを入力してください"); return; }
    const res = await fetch(`${API_BASE}/admin/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: proxyUserId,
        eventId: proxyEventId,
        reservationType: proxyType,
        makeupCreditId: proxyType === "makeup" && proxyCreditId ? proxyCreditId : null,
        overrideCapacity: proxyOverride,
      }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash("代理予約を作成しました"); setProxyUserId(""); setProxyEventId(""); setProxyCreditId(""); setProxyOverride(false); loadReservations();
  };

  const handleCancel = async (id: number) => {
    if (!confirm(`予約 #${id} をキャンセルしますか？`)) return;
    const res = await fetch(`${API_BASE}/admin/reservations/${id}/cancel`, { method: "PATCH" });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`予約 #${id} をキャンセルしました`); loadReservations();
  };

  return (
    <div>
      {/* 代理予約フォーム */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>代理予約（電話対応など）</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span style={label}>ユーザー</span>
            <select style={input} value={proxyUserId} onChange={(e) => setProxyUserId(Number(e.target.value) || "")}>
              <option value="">選択</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} (ID:{u.id})</option>)}
            </select>
          </div>
          <div>
            <span style={label}>イベントID</span>
            <input type="number" style={input} value={proxyEventId} onChange={(e) => setProxyEventId(Number(e.target.value) || "")} />
          </div>
          <div>
            <span style={label}>種別</span>
            <select style={input} value={proxyType} onChange={(e) => setProxyType(e.target.value as any)}>
              <option value="normal">通常</option>
              <option value="makeup">振替</option>
            </select>
          </div>
          {proxyType === "makeup" && (
            <div>
              <span style={label}>振替権利ID</span>
              <input type="number" style={input} value={proxyCreditId} onChange={(e) => setProxyCreditId(Number(e.target.value) || "")} />
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <label style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: "4px" }}>
              <input type="checkbox" checked={proxyOverride} onChange={(e) => setProxyOverride(e.target.checked)} />
              特例承認（定員+1）
            </label>
            <button type="button" style={btn()} onClick={handleProxyReservation}>予約作成</button>
          </div>
        </div>
      </div>

      {/* フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <select style={{ ...input, width: "180px" }} value={filterUserId} onChange={(e) => setFilterUserId(Number(e.target.value) || "")}>
          <option value="">全ユーザー</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "12px" }}>イベントID:</span>
          <input type="number" style={{ ...input, width: "80px" }} value={filterEventId} onChange={(e) => setFilterEventId(Number(e.target.value) || "")} />
        </div>
        <button type="button" style={btn()} onClick={loadReservations}>検索</button>
      </div>

      {/* 一覧 */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ID</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ユーザー</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>イベント</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>日時</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>種別</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ステータス</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {reservations.map((r) => (
            <tr key={r.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 8px" }}>{r.id}</td>
              <td style={{ padding: "6px 8px" }}>{r.user_name} (ID:{r.user_id})</td>
              <td style={{ padding: "6px 8px" }}>#{r.event_id} {r.class_type_name}</td>
              <td style={{ padding: "6px 8px" }}>{r.starts_at?.slice(0, 16)}</td>
              <td style={{ padding: "6px 8px" }}>
                <span style={{ padding: "2px 6px", borderRadius: "9999px", fontSize: "11px", backgroundColor: r.reservation_type === "makeup" ? "#ecfdf3" : "#f3f4f6" }}>
                  {r.reservation_type === "makeup" ? "振替" : "通常"}
                </span>
              </td>
              <td style={{ padding: "6px 8px", fontWeight: 600, color: r.status === "booked" ? "#3b82f6" : r.status === "attended" ? "#059669" : "#dc2626" }}>
                {r.status}
              </td>
              <td style={{ padding: "6px 8px" }}>
                {r.status === "booked" && (
                  <button type="button" style={btn("#dc2626")} onClick={() => handleCancel(r.id)}>キャンセル</button>
                )}
              </td>
            </tr>
          ))}
          {reservations.length === 0 && (
            <tr><td colSpan={7} style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>予約がありません</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// クラス種別管理
// ================================================================
function ClassTypesTab({ classTypes, reload, flash, flashErr }: { classTypes: ClassType[]; reload: () => void; flash: (m: string) => void; flashErr: (m: string) => void }) {
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // 編集中の行
  const [editId, setEditId] = useState<number | null>(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const handleCreate = async () => {
    if (!newCode || !newName) { flashErr("code と name は必須です"); return; }
    const res = await fetch(`${API_BASE}/admin/class-types`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode, name: newName, description: newDesc || null }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash("クラス種別を作成しました");
    setNewCode(""); setNewName(""); setNewDesc("");
    reload();
  };

  const startEdit = (ct: ClassType) => {
    setEditId(ct.id);
    setEditCode(ct.code);
    setEditName(ct.name);
    setEditDesc(ct.description ?? "");
  };

  const cancelEdit = () => { setEditId(null); };

  const handleUpdate = async () => {
    if (!editId) return;
    if (!editCode || !editName) { flashErr("code と name は必須です"); return; }
    const res = await fetch(`${API_BASE}/admin/class-types/${editId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: editCode, name: editName, description: editDesc || null }),
    });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`クラス種別 #${editId} を更新しました`);
    setEditId(null);
    reload();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`クラス種別 #${id} を削除しますか？`)) return;
    const res = await fetch(`${API_BASE}/admin/class-types/${id}`, { method: "DELETE" });
    if (!res.ok) { flashErr((await res.json()).error); return; }
    flash(`クラス種別 #${id} を削除しました`);
    reload();
  };

  return (
    <div>
      {/* 新規作成フォーム */}
      <div style={card}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, marginBottom: "8px" }}>クラス種別を追加</h3>
        <div style={{ display: "grid", gridTemplateColumns: "150px 1fr 1fr auto", gap: "8px", alignItems: "end" }}>
          <div>
            <span style={label}>コード（英数字）</span>
            <input type="text" style={input} value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="kakekko" />
          </div>
          <div>
            <span style={label}>名前</span>
            <input type="text" style={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="かけっこ" />
          </div>
          <div>
            <span style={label}>説明（任意）</span>
            <input type="text" style={input} value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="かけっこクラスの説明" />
          </div>
          <button type="button" style={btn()} onClick={handleCreate}>追加</button>
        </div>
      </div>

      {/* 一覧テーブル */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ backgroundColor: "#f9fafb", textAlign: "left" }}>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>ID</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>コード</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>名前</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>説明</th>
            <th style={{ padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {classTypes.map((ct) => (
            <tr key={ct.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
              <td style={{ padding: "6px 8px" }}>{ct.id}</td>
              {editId === ct.id ? (
                <>
                  <td style={{ padding: "6px 8px" }}>
                    <input type="text" style={{ ...input, width: "120px" }} value={editCode} onChange={(e) => setEditCode(e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input type="text" style={input} value={editName} onChange={(e) => setEditName(e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    <input type="text" style={input} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
                  </td>
                  <td style={{ padding: "6px 8px", display: "flex", gap: "4px" }}>
                    <button type="button" style={btn("#059669")} onClick={handleUpdate}>保存</button>
                    <button type="button" style={btn("#6b7280")} onClick={cancelEdit}>取消</button>
                  </td>
                </>
              ) : (
                <>
                  <td style={{ padding: "6px 8px" }}>{ct.code}</td>
                  <td style={{ padding: "6px 8px", fontWeight: 600 }}>{ct.name}</td>
                  <td style={{ padding: "6px 8px", fontSize: "12px", color: "#6b7280" }}>{ct.description ?? "—"}</td>
                  <td style={{ padding: "6px 8px", display: "flex", gap: "4px" }}>
                    <button type="button" style={btn("#3b82f6")} onClick={() => startEdit(ct)}>編集</button>
                    <button type="button" style={btn("#dc2626")} onClick={() => handleDelete(ct.id)}>削除</button>
                  </td>
                </>
              )}
            </tr>
          ))}
          {classTypes.length === 0 && (
            <tr><td colSpan={5} style={{ padding: "16px", textAlign: "center", color: "#9ca3af" }}>クラス種別がありません</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ================================================================
// 確認モーダル
// ================================================================
function ConfirmModal({
  open,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel = "実行",
  confirmColor = "#3b82f6",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  confirmColor?: string;
}) {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        animation: "fadeIn 0.2s ease",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: "12px",
          padding: "24px",
          minWidth: "360px",
          animation: "slideUp 0.25s ease",
          maxWidth: "500px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "12px" }}>{title}</h3>
        <div style={{ fontSize: "13px", marginBottom: "16px", color: "#374151" }}>{children}</div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              fontSize: "13px",
              padding: "6px 16px",
              borderRadius: "6px",
              border: "1px solid #d1d5db",
              backgroundColor: "#fff",
              cursor: "pointer",
            }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              fontSize: "13px",
              padding: "6px 16px",
              borderRadius: "6px",
              border: "none",
              backgroundColor: confirmColor,
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
