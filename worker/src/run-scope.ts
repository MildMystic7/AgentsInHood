const DEFAULT_SCOPE = "default";

export function mainnetRunScope(): string {
  const configured = String(process.env.MAINNET_RUN_ID || "").trim().toLowerCase();
  if (!configured) return DEFAULT_SCOPE;

  const safe = configured
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (!safe) {
    throw new Error("MAINNET_RUN_ID must contain at least one letter or number");
  }
  return safe;
}

export function scopedKey(base: string): string {
  const scope = mainnetRunScope();
  return scope === DEFAULT_SCOPE ? base : `${base}:${scope}`;
}
