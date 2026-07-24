import Redis from "ioredis";

const URL_ = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;
const REDIS_URL = process.env.REDIS_URL;
let redis: Redis | null = null;

export function kvConfigured(): boolean {
  return Boolean((URL_ && TOKEN) || REDIS_URL);
}

async function railwayRedis(): Promise<Redis | null> {
  if (!REDIS_URL) return null;
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    redis.on("error", () => {
      // Callers already treat persistence failures as non-fatal in dry-run.
    });
  }
  if (redis.status === "wait") await redis.connect();
  return redis.status === "end" ? null : redis;
}

export async function kvGet(key: string): Promise<string | null> {
  if (REDIS_URL) {
    try {
      return (await railwayRedis())?.get(key) ?? null;
    } catch {
      return null;
    }
  }
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
  if (REDIS_URL) {
    try {
      await (await railwayRedis())?.set(key, value);
    } catch {
      // best-effort in dry-run; live mode still refuses to start without KV
    }
    return;
  }
  if (!URL_ || !TOKEN) return;
  try {
    await fetch(`${URL_}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`, {
      headers: { authorization: `Bearer ${TOKEN}` },
    });
  } catch {
    // best-effort — the worker keeps running with in-memory state only
  }
}
