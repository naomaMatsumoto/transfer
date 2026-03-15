"use client";

import React from "react";

export function ConfirmModal({
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
