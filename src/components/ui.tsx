"use client";

import styled from "@emotion/styled";

export const Container = styled.div`
  width: 100%;
  max-width: var(--maxw);
  margin: 0 auto;
  padding: 0 20px;
`;

export const Section = styled.section`
  padding: 44px 0;
  scroll-margin-top: 76px;
  @media (max-width: 640px) {
    padding: 32px 0;
  }
`;

export const SectionHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

export const Kicker = styled.div`
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--accent);
  margin-bottom: 8px;
`;

export const Title = styled.h2`
  font-family: var(--font-display);
  font-weight: 700;
  font-size: clamp(24px, 3.4vw, 34px);
  line-height: 1.05;
  margin: 0;
  letter-spacing: -0.01em;
`;

export const Sub = styled.p`
  color: var(--dim);
  font-size: 14px;
  max-width: 520px;
  margin: 6px 0 0;
  line-height: 1.5;
`;

export const Panel = styled.div`
  background: linear-gradient(180deg, var(--panel), var(--panel-2));
  border: 1px solid var(--border);
  border-radius: var(--radius);
`;

export const Mono = styled.span`
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
`;

export const Pill = styled.span<{ tone?: "green" | "red" | "dim" | "accent" | "gold" }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 999px;
  background: ${(p) =>
    p.tone === "green"
      ? "rgba(0,200,5,0.12)"
      : p.tone === "red"
        ? "rgba(255,80,0,0.12)"
        : p.tone === "accent"
          ? "rgba(0,200,5,0.12)"
          : p.tone === "gold"
            ? "rgba(245,179,1,0.12)"
            : "var(--panel-3)"};
  color: ${(p) =>
    p.tone === "green"
      ? "var(--green)"
      : p.tone === "red"
        ? "var(--red)"
        : p.tone === "accent"
          ? "var(--accent)"
          : p.tone === "gold"
            ? "var(--gold)"
            : "var(--dim)"};
`;

export const Avatar = styled.div<{ bg: string; fg: string }>`
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 13px;
  color: ${(p) => p.fg};
  background: ${(p) => p.bg};
  border: 1px solid ${(p) => p.fg}44;
  flex: 0 0 auto;
`;

export const LiveDot = styled.span<{ active?: boolean }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => (p.active ? "var(--green)" : "var(--faint)")};
  box-shadow: ${(p) => (p.active ? "0 0 0 0 rgba(0,200,5,0.6)" : "none")};
  animation: ${(p) => (p.active ? "pulse 1.6s infinite" : "none")};
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 200, 5, 0.5);
    }
    70% {
      box-shadow: 0 0 0 7px rgba(0, 200, 5, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 200, 5, 0);
    }
  }
`;
