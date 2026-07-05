// Minimal REST client for Vercel KV / Upstash Redis (same REST protocol).
// Used to share real-LLM reasoning across serverless instances. If the env vars
// are absent, callers skip KV entirely and the deterministic reasoning is used.

const URL_ = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvConfigured(): boolean {
  return Boolean(URL_ && TOKEN);
}

export async function kvGet(key: string): Promise<string | null> {
  if (!URL_ || !TOKEN) return null;
  try {
    const res = await fetch(`${URL_}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.result === "string" ? data.result : null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string, ttlSeconds = 7200): Promise<void> {
  if (!URL_ || !TOKEN) return;
  try {
    await fetch(`${URL_}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttlSeconds}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
      cache: "no-store",
    });
  } catch {
    // best-effort — reasoning falls back to the deterministic generator
  }
}
