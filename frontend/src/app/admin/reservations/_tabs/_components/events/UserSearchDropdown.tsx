"use client";

import { useState } from "react";
import type { User } from "../../../types";

type Props = {
  users: User[];
  value: number | "";
  onChange: (userId: number | "") => void;
  disabledIds?: Set<number | "">;
  size?: "sm" | "normal";
  placeholder?: string;
};

export function UserSearchDropdown({
  users,
  value,
  onChange,
  disabledIds,
  size = "normal",
  placeholder = "ユーザーを選択",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState("");

  const selectedUser = value !== "" ? users.find((u) => u.id === value) : null;

  const displayText = isOpen
    ? filter
    : selectedUser
      ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
      : "";

  const filteredUsers = users.filter(
    (u) =>
      !filter.trim() ||
      u.name.toLowerCase().includes(filter.toLowerCase()) ||
      (u.phone ?? "").includes(filter),
  );

  const isSm = size === "sm";

  return (
    <div style={{ position: "relative" }}>
      <div
        className={`d-flex align-items-center border rounded${isSm ? "" : ""}`}
        style={{ backgroundColor: "#fff", minHeight: isSm ? "31px" : "38px" }}
      >
        <input
          type="text"
          className={`form-control${isSm ? " form-control-sm" : ""} border-0 shadow-none`}
          style={{ flex: 1, minWidth: 0 }}
          value={displayText}
          placeholder={placeholder}
          onChange={(e) => {
            setFilter(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setFilter(
              selectedUser
                ? `${selectedUser.name}${selectedUser.phone ? ` (${selectedUser.phone})` : ""}`
                : "",
            );
          }}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        <span
          className={isSm ? "px-2 text-body-secondary small" : ""}
          style={isSm ? { pointerEvents: "none" } : { padding: "0 8px", color: "#6c757d", pointerEvents: "none" }}
        >
          ▼
        </span>
      </div>
      {isOpen && (
        <ul
          className={`list-unstyled mb-0${isSm ? " position-absolute w-100 border rounded shadow-sm" : ""}`}
          style={
            isSm
              ? {
                  top: "100%",
                  marginTop: "2px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "#fff",
                  zIndex: 10,
                  padding: "4px 0",
                }
              : {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  marginTop: "2px",
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid #dee2e6",
                  borderRadius: "6px",
                  backgroundColor: "#fff",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  zIndex: 10,
                  padding: "4px 0",
                }
          }
        >
          {selectedUser && (
            <li
              onMouseDown={(e) => {
                e.preventDefault();
                onChange("");
                setIsOpen(false);
                setFilter("");
              }}
              className={isSm ? "px-3 py-2 small text-body-secondary" : ""}
              style={
                isSm
                  ? { cursor: "pointer", borderBottom: "1px solid #eee" }
                  : {
                      padding: "8px 12px",
                      cursor: "pointer",
                      color: "#6c757d",
                      fontSize: "13px",
                      borderBottom: "1px solid #eee",
                    }
              }
            >
              選択を解除
            </li>
          )}
          {filteredUsers.length === 0 ? (
            <li
              className={isSm ? "px-3 py-2 small text-body-secondary" : ""}
              style={isSm ? undefined : { padding: "8px 12px", color: "#6c757d", fontSize: "14px" }}
            >
              該当なし
            </li>
          ) : (
            filteredUsers.map((u) => {
              const disabled = disabledIds ? disabledIds.has(u.id) : false;
              return (
                <li
                  key={u.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if (disabled) return;
                    onChange(u.id);
                    setIsOpen(false);
                    setFilter("");
                  }}
                  className={isSm ? "px-3 py-2 small" : ""}
                  style={
                    isSm
                      ? {
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.5 : 1,
                          backgroundColor: "transparent",
                        }
                      : {
                          padding: "8px 12px",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.5 : 1,
                          color: disabled ? "#adb5bd" : "#212529",
                          backgroundColor: disabled ? "#f8f9fa" : "transparent",
                          fontSize: "14px",
                        }
                  }
                >
                  {u.name}
                  {u.phone ? ` (${u.phone})` : ""}
                  {disabled ? " — 選択済み" : ""}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
