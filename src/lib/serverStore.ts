import { Redis } from "@upstash/redis";
import type { Character } from "./types";

const STORE_KEY = "wow-guild:store:characters:v1";

export interface StoredState {
  characters: Character[];
  updatedAt: string;
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

export function isConfigured(): boolean {
  return getClient() !== null;
}

export async function loadCharacters(): Promise<StoredState | null> {
  const redis = getClient();
  if (!redis) return null;
  return await redis.get<StoredState>(STORE_KEY);
}

export async function saveCharacters(
  characters: Character[],
): Promise<StoredState> {
  const redis = getClient();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }
  const state: StoredState = {
    characters,
    updatedAt: new Date().toISOString(),
  };
  await redis.set(STORE_KEY, state);
  return state;
}
