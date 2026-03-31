import type { CSSProperties } from "react";
import { container } from "../_styles";

const s = {
  inner: {
    borderTop: "1px solid var(--color-border)",
    padding: "32px 0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "12px",
  } satisfies CSSProperties,

  logo: {
    fontWeight: 700,
    color: "var(--color-primary)",
  } satisfies CSSProperties,

  copy: {
    color: "var(--color-muted)",
    fontSize: "0.85rem",
  } satisfies CSSProperties,
};

export function Footer() {
  return (
    <footer>
      <div style={{ ...container, ...s.inner }}>
        <span style={s.logo}>振替管理</span>
        <span style={s.copy}>© {new Date().getFullYear()} 振替管理. All rights reserved.</span>
      </div>
    </footer>
  );
}
