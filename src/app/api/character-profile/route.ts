import { NextResponse } from "next/server";
import {
  fetchCharacterProfile,
  hasBlizzardCredentials,
} from "@/lib/blizzard";
import type { CharacterProfile } from "@/lib/blizzard";
import { cacheGet, cacheSet } from "@/lib/serverCache";

export const runtime = "nodejs";

interface RequestBody {
  realm?: string;
  name?: string;
  fresh?: boolean;
}

interface ProfileResponse extends CharacterProfile {
  source: "api";
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;
  const realm = body.realm?.trim().toLowerCase();
  const name = body.name?.trim();

  if (!realm || !name) {
    return NextResponse.json(
      { error: "realm, name 둘 다 필요합니다." },
      { status: 400 },
    );
  }

  if (!hasBlizzardCredentials()) {
    return NextResponse.json(
      { error: "서버에 Blizzard 자격증명이 설정되지 않았습니다." },
      { status: 503 },
    );
  }

  const cacheKey = `${realm}__${name}`;
  if (!body.fresh) {
    const hit = await cacheGet<ProfileResponse>("profile", cacheKey);
    if (hit) {
      return NextResponse.json({
        ...hit.value,
        cached: true,
        cachedAgeMs: hit.ageMs,
      });
    }
  }

  try {
    const profile = await fetchCharacterProfile(realm, name);
    const response: ProfileResponse = { ...profile, source: "api" };
    await cacheSet("profile", cacheKey, response);
    return NextResponse.json({ ...response, cached: false, cachedAgeMs: 0 });
  } catch (e) {
    const code = e instanceof Error ? e.message : String(e);
    const status =
      code === "NOT_FOUND" ? 404 : code === "RATE_LIMITED" ? 429 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
