import type { CSSProperties } from "react";
import { PAINS } from "../_constants";
import { container, sectionLabel, sectionTitle } from "../_styles";

const s = {
  section: {
    background: "var(--color-surface)",
    padding: "80px 0",
  } satisfies CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "20px",
  } satisfies CSSProperties,

  card: {
    background: "#fff",
    borderRadius: "var(--radius)",
    padding: "28px 24px",
    border: "1px solid var(--color-border)",
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  } satisfies CSSProperties,

  emoji: {
    fontSize: "1.8rem",
    flexShrink: 0,
  } satisfies CSSProperties,

  text: {
    fontSize: "0.95rem",
    color: "var(--color-text)",
    lineHeight: 1.6,
  } satisfies CSSProperties,
};

export function PainSection() {
  return (
    <section style={s.section}>
      <div style={container}>
        <p style={sectionLabel}>こんなお悩みありませんか？</p>
        <h2 style={sectionTitle}>振替管理のよくある課題</h2>
        <div style={s.grid}>
          {PAINS.map((pain) => (
            <div key={pain.text} style={s.card}>
              <span style={s.emoji}>{pain.emoji}</span>
              <p style={s.text}>{pain.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
