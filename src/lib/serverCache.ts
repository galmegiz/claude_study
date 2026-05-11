import fs from "node:fs/promises";
import path from "node:path";

const CACHE_DIR = process.env.VERCEL
  ? "/tmp/wow-guild-cache"
  : path.join(process.cwd(), ".cache");

export const DEFAULT_TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  storedAt: number;
}

export interface CacheHit<T> {
  value: T;
  ageMs: number;
  expiresAt: number;
  storedAt: number;
}

function slugify(s: string): string {
  return s.replace(/[^a-zA-Z0-9가-힣_-]/g, "_").slice(0, 120);
}

function pathFor(kind: string, key: string): string {
  return path.join(CACHE_DIR, `${slugify(kind)}__${slugify(key)}.json`);
}

export async function cacheGet<T>(
  kind: string,
  key: string,
): Promise<CacheHit<T> | null> {
  try {
    const file = pathFor(kind, key);
    const raw = await fs.readFile(file, "utf8");
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    const now = Date.now();
    if (!parsed.expiresAt || now > parsed.expiresAt) {
      fs.unlink(file).catch(() => {});
      return null;
    }
    return {
      value: parsed.value,
      ageMs: now - parsed.storedAt,
      expiresAt: parsed.expiresAt,
      storedAt: parsed.storedAt,
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
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    const file = pathFor(kind, key);
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      storedAt: now,
      expiresAt: now + ttlMs,
    };
    await fs.writeFile(file, JSON.stringify(entry));
  } catch {
    // 디스크 캐시 실패는 무시 (Vercel readonly 환경 등). API 호출은 그대로 진행.
  }
}
