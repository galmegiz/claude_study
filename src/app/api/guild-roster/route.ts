import { NextResponse } from "next/server";
import { parseGuildUrl, dummyGuildRoster } from "@/lib/guildRoster";
import type { GuildMember } from "@/lib/guildRoster";
import {
  CLASS_ID_TO_NAME,
  fetchGuildRoster,
  hasBlizzardCredentials,
} from "@/lib/blizzard";
import { cacheGet, cacheSet } from "@/lib/serverCache";

export const runtime = "nodejs";

interface RequestBody {
  url?: string;
  realm?: string;
  guild?: string;
  fresh?: boolean;
}

interface RosterResponse {
  realm: string;
  guild: string;
  members: GuildMember[];
  source: "api" | "dummy";
  fetchedAt: string;
  summary: {
    total: number;
    guildName: string;
    realmName: string;
    faction: string;
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as RequestBody;

  let realm = body.realm?.trim().toLowerCase();
  let guild = body.guild?.trim().toLowerCase();

  if (body.url && (!realm || !guild)) {
    const parsed = parseGuildUrl(body.url);
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            "URL 파싱 실패. 예: https://worldofwarcraft.blizzard.com/ko-kr/guild/kr/azshara/nnde/",
        },
        { status: 400 },
      );
    }
    realm = parsed.realm;
    guild = parsed.guild;
  }

  if (!realm || !guild) {
    return NextResponse.json(
      { error: "URL 또는 (서버, 길드 slug)가 필요합니다." },
      { status: 400 },
    );
  }

  const cacheKey = `${realm}__${guild}`;

  if (!body.fresh) {
    const hit = await cacheGet<RosterResponse>("roster", cacheKey);
    if (hit) {
      return NextResponse.json({
        ...hit.value,
        cached: true,
        cachedAgeMs: hit.ageMs,
      });
    }
  }

  if (hasBlizzardCredentials()) {
    try {
      const roster = await fetchGuildRoster(realm, guild);
      const members: GuildMember[] = roster.members.map((m) => ({
        realm: m.realm,
        name: m.name,
        level: m.level,
        charClass: CLASS_ID_TO_NAME[m.classId],
        rank: m.rank,
      }));
      const response: RosterResponse = {
        realm,
        guild,
        members,
        source: "api",
        fetchedAt: new Date().toISOString(),
        summary: {
          total: members.length,
          guildName: roster.guildName,
          realmName: roster.realmName,
          faction: roster.faction,
        },
      };
      await cacheSet("roster", cacheKey, response);
      return NextResponse.json({ ...response, cached: false, cachedAgeMs: 0 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        { error: msg, source: "api" as const },
        { status: 502 },
      );
    }
  }

  // 자격증명 없음 → 더미 폴백 (캐시 안 함)
  await new Promise((r) => setTimeout(r, 300));
  const members = dummyGuildRoster(realm, guild);
  return NextResponse.json({
    realm,
    guild,
    members,
    source: "dummy" as const,
    fetchedAt: new Date().toISOString(),
    summary: {
      total: members.length,
      guildName: guild,
      realmName: realm,
      faction: "-",
    },
    cached: false,
    cachedAgeMs: 0,
  });
}
