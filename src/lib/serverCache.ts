import { Redis } from "@upstash/redis";

export const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  storedAt: number;
  expiresAt: number;
}

export interface CacheHit<T> {
  value: T;
  ageMs: number;
  expiresAt: number;
  storedAt: number;
}

let client: Redis | null = null;
function getClient(): Redis | null {
  if (client) return client;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}

function keyFor(kind: string, key: string): string {
  return `wow-guild:${kind}:${key}`;
}

export async function cacheGet<T>(
  kind: string,
  key: string,
): Promise<CacheHit<T> | null> {
  const redis = getClient();
  if (!redis) return null;
  try {
    const entry = await redis.get<CacheEntry<T>>(keyFor(kind, key));
    if (!entry) return null;
    return {
      value: entry.value,
      storedAt: entry.storedAt,
      ageMs: Date.now() - entry.storedAt,
      expiresAt: entry.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function cacheSet<T>(
  kind: string,
  key: string,
  value: T,
  ttlMs: number = DEFAULT_TTL_MS,
): Promise<void> {
  const redis = getClient();
  if (!redis) return;
  try {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      storedAt: now,
      expiresAt: now + ttlMs,
    };
    await redis.set(keyFor(kind, key), entry, { px: ttlMs });
  } catch {
    // 캐시 실패는 무시 — 원본 API 호출 결과는 그대로 반환.
  }
}
