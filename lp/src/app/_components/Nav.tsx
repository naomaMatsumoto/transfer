import type { CSSProperties } from "react";
import { APP_URL } from "../_constants";
import { container } from "../_styles";

const s = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 0",
  } satisfies CSSProperties,

  logo: {
    fontWeight: 700,
    fontSize: "1.2rem",
    color: "var(--color-primary)",
  } satisfies CSSProperties,

  cta: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--color-primary)",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "8px",
    fontWeight: 600,
    fontSize: "0.9rem",
    transition: "background 0.2s",
  } satisfies CSSProperties,
};

export function Nav() {
  return (
    <header style={{ borderBottom: "1px solid var(--color-border)" }}>
      <div style={container}>
        <nav style={s.nav}>
          <span style={s.logo}>振替管理</span>
          <a href={`${APP_URL}/corporation/register`} style={s.cta}>
            無料で始める →
          </a>
        </nav>
      </div>
    </header>
  );
}
