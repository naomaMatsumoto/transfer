import type { CSSProperties } from "react";
import { FEATURES } from "../_constants";
import { container, sectionLabel, sectionTitle } from "../_styles";

const s = {
  section: {
    padding: "96px 0",
  } satisfies CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "28px",
  } satisfies CSSProperties,

  card: {
    background: "var(--color-surface)",
    borderRadius: "var(--radius)",
    padding: "32px 28px",
    border: "1px solid var(--color-border)",
  } satisfies CSSProperties,

  icon: {
    width: "48px",
    height: "48px",
    background: "#eef2ff",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    marginBottom: "20px",
  } satisfies CSSProperties,

  cardTitle: {
    fontWeight: 700,
    fontSize: "1.1rem",
    marginBottom: "10px",
  } satisfies CSSProperties,

  cardDesc: {
    color: "var(--color-muted)",
    fontSize: "0.93rem",
    lineHeight: 1.65,
  } satisfies CSSProperties,
};

export function FeatureSection() {
  return (
    <section style={s.section}>
      <div style={container}>
        <p style={sectionLabel}>Features</p>
        <h2 style={sectionTitle}>すべての課題を解決する機能</h2>
        <div style={s.grid}>
          {FEATURES.map((feature) => (
            <div key={feature.title} style={s.card}>
              <div style={s.icon}>{feature.icon}</div>
              <h3 style={s.cardTitle}>{feature.title}</h3>
              <p style={s.cardDesc}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
