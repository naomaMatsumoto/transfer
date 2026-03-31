import type { CSSProperties } from "react";
import { TARGETS } from "../_constants";
import { container, sectionLabel, sectionTitle } from "../_styles";

const s = {
  section: {
    background: "var(--color-surface)",
    padding: "80px 0",
  } satisfies CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    maxWidth: "800px",
    margin: "0 auto",
  } satisfies CSSProperties,

  card: {
    background: "#fff",
    borderRadius: "var(--radius)",
    padding: "24px 16px",
    border: "1px solid var(--color-border)",
    textAlign: "center",
  } satisfies CSSProperties,

  emoji: {
    fontSize: "2.2rem",
    marginBottom: "12px",
  } satisfies CSSProperties,

  label: {
    fontWeight: 600,
    fontSize: "0.95rem",
  } satisfies CSSProperties,
};

export function TargetSection() {
  return (
    <section style={s.section}>
      <div style={container}>
        <p style={sectionLabel}>こんな教室に</p>
        <h2 style={sectionTitle}>業種を問わず対応</h2>
        <div style={s.grid}>
          {TARGETS.map((target) => (
            <div key={target.label} style={s.card}>
              <div style={s.emoji}>{target.emoji}</div>
              <p style={s.label}>{target.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
