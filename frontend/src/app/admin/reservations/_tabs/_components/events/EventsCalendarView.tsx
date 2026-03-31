"use client";

import type { AdminEvent } from "../../../types";

type Props = {
  events: AdminEvent[];
  calMonth: Date;
  onMonthChange: (d: Date) => void;
  calClickMode: "edit" | "select";
  selectedIds: Set<number>;
  onEventClick: (ev: AdminEvent) => void;
};

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export function EventsCalendarView({
  events,
  calMonth,
  onMonthChange,
  calClickMode,
  selectedIds,
  onEventClick,
}: Props) {
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

  return (
    <div style={{ paddingBottom: "24px" }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onMonthChange(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
        >
          ◀ 前月
        </button>
        <span style={{ fontWeight: 600, fontSize: "14px" }}>
          {calMonth.getFullYear()}年 {calMonth.getMonth() + 1}月
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onMonthChange(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
        >
          次月 ▶
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
        {["日", "月", "火", "水", "木", "金", "土"].map((w, i) => (
          <div
            key={w}
            style={{
              textAlign: "center",
              fontSize: "12px",
              fontWeight: 600,
              color: i === 0 ? "#dc2626" : i === 6 ? "#2563eb" : "#6b7280",
              paddingBottom: "4px",
            }}
          >
            {w}
          </div>
        ))}
        {calGrid.map((date) => {
          const d = new Date(date);
          const dayOfWeek = d.getDay();
          const isCurrentMonth = d.getMonth() === calMonth.getMonth() && d.getFullYear() === calMonth.getFullYear();
          const list = eventsByDate.get(date) ?? [];
          const todayNow = new Date();
          todayNow.setHours(0, 0, 0, 0);
          const isToday =
            d.getFullYear() === todayNow.getFullYear() &&
            d.getMonth() === todayNow.getMonth() &&
            d.getDate() === todayNow.getDate();

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
              <div
                style={{
                  fontWeight: 700,
                  fontSize: "13px",
                  color: dayOfWeek === 0 ? "#dc2626" : dayOfWeek === 6 ? "#2563eb" : "#374151",
                  marginBottom: "4px",
                }}
              >
                {d.getDate()}
              </div>
              {list.length === 0 && <div style={{ fontSize: "10px", color: "#d1d5db" }}>—</div>}
              {list.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    fontSize: "12px",
                    padding: "5px 7px",
                    borderRadius: "6px",
                    marginBottom: "4px",
                    backgroundColor: selectedIds.has(ev.id)
                      ? "#dbeafe"
                      : ev.status === "scheduled"
                        ? "#ecfdf5"
                        : ev.status === "holiday"
                          ? "#f3f4f6"
                          : "#fee2e2",
                    border: selectedIds.has(ev.id) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                    cursor: "pointer",
                    overflow: "hidden",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => onEventClick(ev)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}>
                    {calClickMode === "select" && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(ev.id)}
                        onChange={() => onEventClick(ev)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: "14px", height: "14px", flexShrink: 0 }}
                      />
                    )}
                    <span style={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {(ev.starts_at ?? "").slice(11, 16)}
                    </span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        flex: 1,
                        fontWeight: 500,
                      }}
                    >
                      {ev.class_type_name}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      paddingLeft: calClickMode === "select" ? "19px" : "0",
                    }}
                  >
                    <span
                      style={{
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        color:
                          ev.status === "scheduled" ? "#065f46" : ev.status === "holiday" ? "#374151" : "#991b1b",
                        backgroundColor:
                          ev.status === "scheduled" ? "#d1fae5" : ev.status === "holiday" ? "#e5e7eb" : "#fee2e2",
                      }}
                    >
                      {ev.status === "scheduled" ? "開催" : ev.status === "holiday" ? "休み" : "休講"}
                    </span>
                    <span style={{ color: "#6b7280", fontSize: "11px" }}>
                      {ev.reserved_count}/{ev.capacity}人
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
