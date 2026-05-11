const NAME_POOL = [
  "차넬",
  "홀리차넬",
  "번달",
  "도적님",
  "부캐전사",
  "얼죽마",
  "사냥사냥",
  "드루님",
  "팔라딘짱",
  "흑마님",
  "주술왕",
  "워록",
  "탱커마스터",
  "큐벨림",
  "성기사짱",
  "사제짱",
  "법사짱",
  "기원짱",
  "악사짱",
  "수도님",
  "딜링머신",
  "힐러대장",
  "탱딜겸장",
  "기원사장",
  "쩌는워록",
  "노프힐러",
  "캐피탈",
  "샤먼킹",
  "전사왕",
  "딜폭주",
  "수꼬레이드",
  "버스기사",
  "야성드루",
  "보호드루",
  "잠수러",
  "본캐",
];

export interface GuildLocator {
  realm: string;
  guild: string;
}

export interface GuildMember {
  realm: string;
  name: string;
  level?: number;
  charClass?: string;
  rank?: number;
}

export function parseGuildUrl(url: string): GuildLocator | null {
  try {
    const u = new URL(url.trim());
    if (!/worldofwarcraft\.blizzard\.com$/i.test(u.hostname)) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    const guildIdx = parts.indexOf("guild");
    if (guildIdx < 0 || parts.length < guildIdx + 4) return null;
    const realm = decodeURIComponent(parts[guildIdx + 2]).toLowerCase();
    const guild = decodeURIComponent(parts[guildIdx + 3]).toLowerCase();
    if (!realm || !guild) return null;
    return { realm, guild };
  } catch {
    return null;
  }
}

function hash32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function dummyGuildRoster(
  realm: string,
  guild: string,
): GuildMember[] {
  const seed = hash32(`${realm.toLowerCase()}::${guild.toLowerCase()}`);
  const count = 8 + (seed % 18);
  const out: GuildMember[] = [];
  const used = new Set<number>();
  let cursor = seed;
  while (out.length < count && used.size < NAME_POOL.length) {
    const idx = cursor % NAME_POOL.length;
    cursor = Math.imul(cursor + 0x9e3779b1, 0x85ebca6b) >>> 0;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push({ realm, name: NAME_POOL[idx] });
  }
  return out;
}
