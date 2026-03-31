"use client";

import type { User } from "../../../types";
import type { ReserveRow } from "./types";
import { UserSearchDropdown } from "./UserSearchDropdown";

type Props = {
  list: ReserveRow[];
  onChange: (list: ReserveRow[]) => void;
  users: User[];
  maxRows: number;
  alreadyReservedIds?: Set<number>; // for edit modal: existing reservations already in the event
  size?: "sm" | "normal";
};

export function ReserveRowList({ list, onChange, users, maxRows, alreadyReservedIds, size = "sm" }: Props) {
  return (
    <>
      {list.map((row, idx) => {
        const otherSelectedIds = new Set<number | "">(
          list.map((r, i) => (i === idx ? null : r.userId)).filter((id): id is number => id !== null && id !== ""),
        );
        // also disable already-reserved ids (from edit modal)
        const disabledIds = new Set<number | "">([...otherSelectedIds, ...(alreadyReservedIds ?? [])]);

        return (
          <div key={idx} className="d-flex gap-2 align-items-end mb-2 flex-wrap">
            <div style={{ position: "relative", flex: "1 1 160px", minWidth: 0 }}>
              <label className="form-label small mb-1">ユーザー</label>
              <UserSearchDropdown
                users={users}
                value={row.userId}
                onChange={(userId) => onChange(list.map((r, i) => (i === idx ? { ...r, userId } : r)))}
                disabledIds={disabledIds}
                size={size}
                placeholder="名前・電話で検索"
              />
            </div>
            <div style={{ flex: "0 0 100px" }}>
              <label className="form-label small mb-1">種別</label>
              <select
                className="form-select form-select-sm"
                value={row.type}
                onChange={(e) =>
                  onChange(list.map((r, i) => (i === idx ? { ...r, type: e.target.value as "normal" | "makeup" } : r)))
                }
              >
                <option value="normal">通常</option>
                <option value="makeup">振替</option>
              </select>
            </div>
            {row.type === "makeup" && (
              <div style={{ flex: "0 0 90px" }}>
                <label className="form-label small mb-1">権利ID</label>
                <input
                  type="number"
                  className="form-control form-control-sm"
                  value={row.creditId === "" ? "" : row.creditId}
                  onChange={(e) =>
                    onChange(list.map((r, i) => (i === idx ? { ...r, creditId: Number(e.target.value) || "" } : r)))
                  }
                />
              </div>
            )}
            {list.length > 1 && (
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onChange(list.filter((_, i) => i !== idx))}
              >
                削除
              </button>
            )}
          </div>
        );
      })}
      {list.length < maxRows && (
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={() => onChange([...list, { userId: "", type: "normal", creditId: "" }])}
        >
          ＋もう1人追加
        </button>
      )}
    </>
  );
}
