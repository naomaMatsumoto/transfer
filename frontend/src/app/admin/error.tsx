"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Admin error:", error);
  }, [error]);

  return (
    <div style={{ padding: "2rem", maxWidth: "600px" }}>
      <h2 style={{ fontSize: "18px", marginBottom: "8px" }}>エラーが発生しました</h2>
      <pre style={{ fontSize: "12px", color: "#b91c1c", overflow: "auto", marginBottom: "16px" }}>{error.message}</pre>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: "8px 16px",
          borderRadius: "6px",
          border: "none",
          background: "#2563eb",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        再試行
      </button>
    </div>
  );
}
