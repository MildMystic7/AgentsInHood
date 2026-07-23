// Same tiny Upstash Redis REST client as the main site (src/engine/kv.ts),
// duplicated here so this worker stays a fully self-contained deployable unit.

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export function kvConfigured(): boolean {
  return Boolean(URL_ && TOKEN);
}

export async function kvGet(key: string): Promise<string | null> {
  if (!URL_ || !TOKEN) return null;
  try {
    const res = await fetch(`${URL_}/get/${encodeURIComponent(key)}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    return typeof data?.result === "string" ? data.result : null;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: string): Promise<void> {
  if (!URL_ || !TOKEN) return;
  try {
    await fetch(`${URL_}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
  } catch {
    // best-effort — the worker keeps running with in-memory state only
  }
}
