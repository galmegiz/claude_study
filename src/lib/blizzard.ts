import type { CharacterClass } from "./types";

export const CLASS_ID_TO_NAME: Record<number, CharacterClass> = {
  1: "전사",
  2: "성기사",
  3: "사냥꾼",
  4: "도적",
  5: "사제",
  6: "죽음의기사",
  7: "주술사",
  8: "마법사",
  9: "흑마법사",
  10: "수도사",
  11: "드루이드",
  12: "악마사냥꾼",
  13: "기원사",
};

export interface RosterMember {
  realm: string;
  name: string;
  level: number;
  classId: number;
  rank: number;
}

export interface RosterResult {
  guildName: string;
  realmName: string;
  faction: string;
  members: RosterMember[];
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function hasBlizzardCredentials(): boolean {
  return Boolean(
    process.env.BLIZZARD_CLIENT_ID && process.env.BLIZZARD_CLIENT_SECRET,
  );
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < cachedToken.expiresAt - 30_000) {
    return cachedToken.value;
  }
  const id = process.env.BLIZZARD_CLIENT_ID;
  const secret = process.env.BLIZZARD_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("Blizzard 자격증명이 설정되지 않았습니다.");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const resp = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!resp.ok) {
    throw new Error(`OAuth 토큰 발급 실패 (${resp.status})`);
  }
  const data = (await resp.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };
  return data.access_token;
}

export async function fetchGuildRoster(
  realmSlug: string,
  guildSlug: string,
): Promise<RosterResult> {
  const token = await getAccessToken();
  const region = (process.env.BLIZZARD_REGION || "kr").toLowerCase();
  const url =
    `https://${region}.api.blizzard.com/data/wow/guild/` +
    `${encodeURIComponent(realmSlug)}/${encodeURIComponent(guildSlug)}/roster` +
    `?namespace=profile-${region}&locale=ko_KR`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (resp.status === 404) {
    throw new Error(
      `길드를 찾을 수 없습니다 (404). realm='${realmSlug}', guild='${guildSlug}' 슬러그가 정확한지 확인하세요.`,
    );
  }
  if (resp.status === 401) {
    cachedToken = null;
    throw new Error("Blizzard API 인증 실패 (401)");
  }
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Blizzard API ${resp.status}: ${body.slice(0, 200)}`);
  }

  const data = (await resp.json()) as RosterApiResponse;
  const members: RosterMember[] = (data.members ?? [])
    .map((m): RosterMember | null => {
      const name = m.character?.name;
      if (!name) return null;
      return {
        realm: m.character?.realm?.slug ?? realmSlug,
        name,
        level: m.character?.level ?? 0,
        classId: m.character?.playable_class?.id ?? 0,
        rank: m.rank ?? -1,
      };
    })
    .filter((x): x is RosterMember => x !== null);

  return {
    guildName: data.guild?.name ?? guildSlug,
    realmName: data.guild?.realm?.name ?? realmSlug,
    faction: data.guild?.faction?.name ?? "",
    members,
  };
}

export interface CharacterProfile {
  name: string;
  level: number | null;
  equippedItemLevel: number | null;
  averageItemLevel: number | null;
  lastLoginIso: string | null;
  classId: number | null;
}

export async function fetchCharacterProfile(
  realmSlug: string,
  name: string,
): Promise<CharacterProfile> {
  const token = await getAccessToken();
  const region = (process.env.BLIZZARD_REGION || "kr").toLowerCase();
  const encodedName = encodeURIComponent(name.toLowerCase());
  const url =
    `https://${region}.api.blizzard.com/profile/wow/character/` +
    `${encodeURIComponent(realmSlug.toLowerCase())}/${encodedName}` +
    `?namespace=profile-${region}&locale=ko_KR`;

  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (resp.status === 404) {
    throw new Error("NOT_FOUND");
  }
  if (resp.status === 401) {
    cachedToken = null;
    throw new Error("AUTH_FAILED");
  }
  if (resp.status === 429) {
    throw new Error("RATE_LIMITED");
  }
  if (!resp.ok) {
    throw new Error(`HTTP_${resp.status}`);
  }

  const d = (await resp.json()) as ProfileApiResponse;
  const ts = d.last_login_timestamp;
  return {
    name: d.name ?? name,
    level: d.level ?? null,
    equippedItemLevel: d.equipped_item_level ?? null,
    averageItemLevel: d.average_item_level ?? null,
    lastLoginIso: ts ? new Date(ts).toISOString() : null,
    classId: d.character_class?.id ?? null,
  };
}

interface ProfileApiResponse {
  name?: string;
  level?: number;
  equipped_item_level?: number;
  average_item_level?: number;
  last_login_timestamp?: number;
  character_class?: { id?: number };
}

interface RosterApiResponse {
  guild?: {
    name?: string;
    realm?: { name?: string; slug?: string };
    faction?: { name?: string };
  };
  members?: Array<{
    rank?: number;
    character?: {
      name?: string;
      level?: number;
      realm?: { slug?: string };
      playable_class?: { id?: number };
    };
  }>;
}
