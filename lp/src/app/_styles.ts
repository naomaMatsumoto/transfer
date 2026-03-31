import type { CSSProperties } from "react";

export const container: CSSProperties = {
  maxWidth: "1080px",
  margin: "0 auto",
  padding: "0 24px",
};

export const sectionLabel: CSSProperties = {
  textAlign: "center",
  fontWeight: 700,
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  color: "var(--color-muted)",
  textTransform: "uppercase",
  marginBottom: "16px",
};

export const sectionTitle: CSSProperties = {
  textAlign: "center",
  fontSize: "clamp(1.5rem, 3vw, 2.2rem)",
  fontWeight: 800,
  marginBottom: "48px",
  letterSpacing: "-0.01em",
};
