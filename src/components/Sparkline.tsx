"use client";

import type { PortfolioPoint } from "@/engine/types";

export default function Sparkline({ data, width = 96, height = 30 }: { data: PortfolioPoint[]; width?: number; height?: number }) {
  const pts = data.slice(-24);
  if (pts.length < 2) return <svg width={width} height={height} />;
  const values = pts.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const up = values[values.length - 1] >= values[0];
  const color = up ? "var(--green)" : "var(--red)";
  const step = width / (pts.length - 1);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - ((v - min) / span) * (height - 4) - 2).toFixed(1)}`)
    .join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
