"use client";

import { useState, useCallback, useEffect } from "react";
import { adminGet } from "@/app/lib/api";
import type { ClassType, User, Staff, AdminEvent } from "../types";
import { EventEditModal } from "./_components/events/EventEditModal";
import { EventCreateModal } from "./_components/events/EventCreateModal";
import { BulkOperationsPanel } from "./_components/events/BulkOperationsPanel";
import { EventsCalendarView } from "./_components/events/EventsCalendarView";
import { EventsTableView } from "./_components/events/EventsTableView";

export function EventsTab({
  classTypes,
  users,
  staff,
  flash,
  flashErr,
}: {
  classTypes: ClassType[];
  users: User[];
  staff: Staff[];
  flash: (m: string) => void;
  flashErr: (m: string) => void;
  apiBase?: string;
}) {
  // event list + date range
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [from, setFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [to, setTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // selection (shared between BulkOps and views)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // edit modal trigger
  const [editEvent, setEditEvent] = useState<AdminEvent | null>(null);

  // create modal trigger
  const [createOpen, setCreateOpen] = useState(false);

  // view mode
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");
  // カレンダーのクリックモード: "edit" = 編集, "select" = 選択
  const [calClickMode, setCalClickMode] = useState<"edit" | "select">("edit");
  // カレンダー用: 月の状態
  const [calMonth, setCalMonth] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  const loadEvents = useCallback(async () => {
    try {
      const r = await adminGet<AdminEvent[]>(`/events?from=${from}&to=${to}`);
      setEvents(r.ok && Array.isArray(r.data) ? r.data : []);
    } catch {
      flashErr("イベント読み込み失敗");
    }
  }, [from, to, flashErr]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(events.map((e) => e.id)));
  const deselectAll = () => setSelectedIds(new Set());

  return (
    <div className="bg-white rounded-3 shadow-sm p-4">
      <EventEditModal
        event={editEvent}
        onClose={() => setEditEvent(null)}
        onSaved={loadEvents}
        flash={flash}
        flashErr={flashErr}
        users={users}
        staff={staff}
      />

      {/* イベント作成ボタン */}
      <div className="mb-3">
        <button type="button" className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          イベントを作成
        </button>
      </div>

      <EventCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          setCreateOpen(false);
          loadEvents();
        }}
        onReload={loadEvents}
        classTypes={classTypes}
        users={users}
        staff={staff}
        flash={flash}
        flashErr={flashErr}
      />

      {/* 表示切替 + 期間フィルタ */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px", flexWrap: "wrap" }}>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === "calendar" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setViewMode("calendar")}
        >
          カレンダー
        </button>
        <button
          type="button"
          className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-outline-secondary"}`}
          onClick={() => setViewMode("table")}
        >
          テーブル
        </button>
        <span style={{ borderLeft: "1px solid #d1d5db", height: "20px", margin: "0 4px" }} />
        <span style={{ fontSize: "13px" }}>期間:</span>
        <input
          type="date"
          className="form-control"
          style={{ width: "150px" }}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <span>〜</span>
        <input
          type="date"
          className="form-control"
          style={{ width: "150px" }}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <button type="button" className="btn btn-primary" onClick={loadEvents}>
          検索
        </button>
      </div>

      {/* カレンダー時のモード切替 */}
      {viewMode === "calendar" && (
        <div style={{ marginBottom: "10px" }}>
          <span style={{ fontSize: "12px", color: "#6b7280", marginRight: "8px" }}>モード:</span>
          <div
            style={{
              display: "inline-flex",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              overflow: "hidden",
              backgroundColor: "#f9fafb",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setCalClickMode("edit");
                deselectAll();
              }}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                border: "none",
                borderRadius: 0,
                backgroundColor: calClickMode === "edit" ? "#fff" : "transparent",
                color: calClickMode === "edit" ? "#1d4ed8" : "#6b7280",
                fontWeight: calClickMode === "edit" ? 600 : 400,
                cursor: "pointer",
                boxShadow: calClickMode === "edit" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              編集（クリックで1件ずつ）
            </button>
            <button
              type="button"
              onClick={() => {
                setCalClickMode("select");
              }}
              style={{
                fontSize: "13px",
                padding: "6px 16px",
                border: "none",
                borderLeft: "1px solid #e5e7eb",
                backgroundColor: calClickMode === "select" ? "#fff" : "transparent",
                color: calClickMode === "select" ? "#1d4ed8" : "#6b7280",
                fontWeight: calClickMode === "select" ? 600 : 400,
                cursor: "pointer",
                boxShadow: calClickMode === "select" ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
              }}
            >
              まとめて操作（複数選択）
            </button>
          </div>
          {calClickMode === "select" && (
            <span style={{ fontSize: "12px", color: "#6b7280", marginLeft: "10px" }}>
              カレンダーのイベントをクリックで選択
            </span>
          )}
        </div>
      )}

      <BulkOperationsPanel
        events={events}
        selectedIds={selectedIds}
        onSelectIds={setSelectedIds}
        flash={flash}
        flashErr={flashErr}
        onReload={loadEvents}
        users={users}
        show={viewMode === "table" || calClickMode === "select"}
      />

      {viewMode === "calendar" && (
        <EventsCalendarView
          events={events}
          calMonth={calMonth}
          onMonthChange={setCalMonth}
          calClickMode={calClickMode}
          selectedIds={selectedIds}
          onEventClick={(ev) => (calClickMode === "select" ? toggleSelect(ev.id) : setEditEvent(ev))}
        />
      )}

      {viewMode === "table" && (
        <EventsTableView
          events={events}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          flash={flash}
          flashErr={flashErr}
          onReload={loadEvents}
        />
      )}
    </div>
  );
}
