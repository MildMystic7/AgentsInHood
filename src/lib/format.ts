export function money(n: number, digits = 2): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function signColor(n: number): string {
  return n > 0 ? "var(--green)" : n < 0 ? "var(--red)" : "var(--dim)";
}

/** Price formatting that handles both majors ($1,593.21) and memecoins ($0.0000071). */
export function price(n: number): string {
  if (n === 0) return "$0";
  if (n >= 1) return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (n >= 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toPrecision(2)}`;
}

export function tokens(n: number): string {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(3);
  return n.toPrecision(3);
}

export function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

export function timeAgo(ts: number, nowHour: number, startISO: string): string {
  return `H${Math.round((ts - new Date(startISO).getTime()) / 3_600_000)}`;
}
