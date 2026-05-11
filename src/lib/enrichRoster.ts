import type { CharacterClass } from "./types";
import type { PendingTarget } from "./store";

export interface ProfileResponse {
  name: string;
  level: number | null;
  equippedItemLevel: number | null;
  averageItemLevel: number | null;
  lastLoginIso: string | null;
  classId: number | null;
  source: "api";
}

const CLASS_BY_ID: Record<number, CharacterClass> = {
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

export interface EnrichCallbacks {
  onOk: (
    id: string,
    data: {
      level: number | null;
      equippedItemLevel: number | null;
      averageItemLevel: number | null;
      lastLoginIso: string | null;
      charClass: CharacterClass | null;
    },
  ) => void;
  onError: (id: string, error: string) => void;
  onProgress: () => void;
}

const DEFAULT_CONCURRENCY = 10;

export async function enrichRoster(
  targets: PendingTarget[],
  cb: EnrichCallbacks,
  concurrency = DEFAULT_CONCURRENCY,
): Promise<void> {
  const queue: PendingTarget[] = [...targets];

  const worker = async () => {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) break;
      try {
        const resp = await fetch("/api/character-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ realm: t.realm, name: t.name }),
        });
        if (resp.status === 429) {
          await new Promise((r) => setTimeout(r, 1500));
          queue.unshift(t);
          continue;
        }
        const data = await resp.json();
        if (!resp.ok) {
          cb.onError(t.id, data.error ?? `HTTP ${resp.status}`);
        } else {
          const d = data as ProfileResponse;
          cb.onOk(t.id, {
            level: d.level,
            equippedItemLevel: d.equippedItemLevel,
            averageItemLevel: d.averageItemLevel,
            lastLoginIso: d.lastLoginIso,
            charClass: d.classId !== null ? (CLASS_BY_ID[d.classId] ?? null) : null,
          });
        }
      } catch (e) {
        cb.onError(t.id, e instanceof Error ? e.message : String(e));
      } finally {
        cb.onProgress();
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()),
  );
}
