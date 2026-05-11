import type { Character, CharacterInput, CharacterClass } from "./types";

const CLASSES: CharacterClass[] = [
  "전사",
  "성기사",
  "사냥꾼",
  "도적",
  "사제",
  "주술사",
  "마법사",
  "흑마법사",
  "죽음의기사",
  "드루이드",
  "기원사",
  "악마사냥꾼",
  "수도사",
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function rand(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const v = x - Math.floor(x);
  return Math.floor(v * (max - min + 1)) + min;
}

const FAIL_SENTINEL = "없는";

export function dummyFetch(input: CharacterInput): Character {
  const key = `${input.realm.toLowerCase()}::${input.name.toLowerCase()}`;
  const seed = hashString(key);

  const fail = input.name.includes(FAIL_SENTINEL);

  const now = Date.now();
  const daysBack = rand(seed, 0, 45);
  const minutesJitter = rand(seed + 7, 0, 1439);
  const lastLogin = new Date(
    now - daysBack * 24 * 60 * 60 * 1000 - minutesJitter * 60 * 1000,
  );

  const level = input.level ?? rand(seed + 1, 60, 90);
  const avg =
    level >= 85
      ? rand(seed + 2, 620, 690)
      : level >= 80
        ? rand(seed + 2, 580, 660)
        : rand(seed + 2, 380, 560);
  const equipped = Math.max(avg - rand(seed + 3, 0, 6), 1);

  const charClass: CharacterClass =
    input.charClass ?? CLASSES[rand(seed + 5, 0, CLASSES.length - 1)];

  const addedAt = new Date().toISOString();

  if (fail) {
    return {
      id: `dum-${seed.toString(36)}`,
      realm: input.realm,
      name: input.name,
      charClass,
      level: null,
      equippedItemLevel: null,
      averageItemLevel: null,
      lastLoginIso: null,
      source: "dummy",
      status: "ERROR",
      note: input.note,
      addedAt,
    };
  }

  return {
    id: `dum-${seed.toString(36)}`,
    realm: input.realm,
    name: input.name,
    charClass,
    level,
    equippedItemLevel: equipped,
    averageItemLevel: avg,
    lastLoginIso: lastLogin.toISOString(),
    source: "dummy",
    status: "OK",
    note: input.note,
    addedAt,
  };
}

export async function dummyFetchAsync(
  input: CharacterInput,
  opts?: { delayMs?: number },
): Promise<Character> {
  const delay = opts?.delayMs ?? 200;
  await new Promise((r) => setTimeout(r, delay));
  return dummyFetch(input);
}
