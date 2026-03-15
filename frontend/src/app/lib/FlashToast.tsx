"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  msg: string | null;
  err: string | null;
  msgExiting: boolean;
  errExiting: boolean;
};

const KEYFRAMES = `
@keyframes __flash-toast-in {
  from { opacity: 0; transform: translateY(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
}`;

function injectStyle() {
  const id = "__flash-toast-style__";
  if (typeof document !== "undefined" && !document.getElementById(id)) {
    const s = document.createElement("style");
    s.id = id;
    s.textContent = KEYFRAMES;
    document.head.appendChild(s);
  }
}

type ToastItemProps = {
  text: string;
  type: "success" | "error";
  exiting: boolean;
};

function ToastItem({ text, type, exiting }: ToastItemProps) {
  const isSuccess = type === "success";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "#fff",
        borderRadius: "8px",
        padding: "10px 16px",
        boxShadow: "0 6px 16px rgba(0,0,0,0.12), 0 3px 6px rgba(0,0,0,0.08)",
        fontSize: "14px",
        lineHeight: 1.5,
        maxWidth: "480px",
        opacity: exiting ? 0 : 1,
        transform: exiting ? "translateY(-8px)" : undefined,
        transition: exiting ? "opacity 0.3s ease, transform 0.3s ease" : undefined,
        animation: exiting ? "none" : "__flash-toast-in 0.25s ease",
      }}
    >
      <span
        style={{
          flexShrink: 0,
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "11px",
          fontWeight: 700,
          background: isSuccess ? "#52c41a" : "#ff4d4f",
          color: "#fff",
        }}
      >
        {isSuccess ? "✓" : "✕"}
      </span>
      <span style={{ color: "rgba(0,0,0,0.85)" }}>{text}</span>
    </div>
  );
}

export function FlashToast({ msg, err, msgExiting, errExiting }: Props) {
  useEffect(() => { injectStyle(); }, []);

  if (typeof document === "undefined") return null;
  if (!msg && !err) return null;

  const content = (
    <div
      style={{
        position: "fixed",
        top: "20px",
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        zIndex: 99999,
        pointerEvents: "none",
      }}
    >
      {msg && <ToastItem text={msg} type="success" exiting={msgExiting} />}
      {err && <ToastItem text={err} type="error" exiting={errExiting} />}
    </div>
  );

  return createPortal(content, document.body);
}
