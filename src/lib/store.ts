"use client";

import { create } from "zustand";
import type { Character, CharacterInput, CharacterClass } from "./types";
import { dummyFetch } from "./dummyFetch";
import { enrichRoster } from "./enrichRoster";
import { STALE_DAYS } from "./format";

export interface PendingTarget {
  id: string;
  realm: string;
  name: string;
}

export interface ProfilePatch {
  level: number | null;
  equippedItemLevel: number | null;
  averageItemLevel: number | null;
  lastLoginIso: string | null;
  charClass?: CharacterClass | null;
}

export interface EnrichmentState {
  total: number;
  done: number;
  startedAt: number;
}

interface ServerState {
  characters: Character[] | null;
  updatedAt: string | null;
}

interface GuildState {
  characters: Character[];
  hydrated: boolean;
  adminMode: boolean;
  enrichment: EnrichmentState | null;
  staleDays: number;
  lastUpdatedAt: string | null;
  setAdminMode: (v: boolean) => void;
  setStaleDays: (v: number) => void;
  loadFromServer: () => Promise<void>;
  addCharacter: (input: CharacterInput) => Character;
  addMany: (inputs: CharacterInput[]) => { added: number; duplicates: number };
  addPending: (
    inputs: (CharacterInput & { rank?: number })[],
  ) => { targets: PendingTarget[]; added: number; updated: number };
  applyProfile: (id: string, patch: ProfilePatch) => void;
  markError: (id: string) => void;
  startEnrichment: (total: number) => void;
  tickEnrichment: () => void;
  endEnrichment: () => void;
  removeCharacter: (id: string) => void;
  refreshCharacter: (id: string) => void;
  refreshAll: () => void;
  retryErrors: () => Promise<void>;
  clearAll: () => void;
}

function sameCharacter(a: { realm: string; name: string }, b: CharacterInput) {
  return (
    a.realm.trim().toLowerCase() === b.realm.trim().toLowerCase() &&
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  );
}

async function persistToServer(characters: Character[]): Promise<string | null> {
  try {
    const res = await fetch("/api/characters", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ characters }),
    });
    if (!res.ok) {
      console.error("[guild-store] server save failed:", res.status);
      return null;
    }
    const data = (await res.json()) as { updatedAt: string };
    return data.updatedAt;
  } catch (e) {
    console.error("[guild-store] server save error:", e);
    return null;
  }
}

export const useGuildStore = create<GuildState>()((set, get) => {
  // 변경된 characters를 서버에 저장하고 lastUpdatedAt을 갱신. hydrate 전엔 no-op.
  const save = () => {
    if (!get().hydrated) return;
    void persistToServer(get().characters).then((updatedAt) => {
      if (updatedAt) set({ lastUpdatedAt: updatedAt });
    });
  };

  return {
    characters: [],
    hydrated: false,
    adminMode: false,
    enrichment: null,
    staleDays: STALE_DAYS,
    lastUpdatedAt: null,

    setAdminMode: (v) => set({ adminMode: v }),
    setStaleDays: (v) => {
      const n = Math.max(1, Math.min(3650, Math.floor(v)));
      if (Number.isFinite(n)) set({ staleDays: n });
    },

    loadFromServer: async () => {
      try {
        const res = await fetch("/api/characters", { cache: "no-store" });
        if (!res.ok) {
          console.error("[guild-store] load failed:", res.status);
          return;
        }
        const data = (await res.json()) as ServerState;
        set({
          characters: data.characters ?? [],
          lastUpdatedAt: data.updatedAt,
          hydrated: true,
        });
      } catch (e) {
        console.error("[guild-store] load error:", e);
      }
    },

    addPending: (inputs) => {
      const next = [...get().characters];
      const targets: PendingTarget[] = [];
      let added = 0;
      let updated = 0;
      for (const input of inputs) {
        const idx = next.findIndex(
          (c) =>
            c.realm.trim().toLowerCase() === input.realm.trim().toLowerCase() &&
            c.name.trim().toLowerCase() === input.name.trim().toLowerCase(),
        );
        if (idx >= 0) {
          const existing = next[idx];
          next[idx] = {
            ...existing,
            level: input.level ?? existing.level,
            charClass:
              (input.charClass as CharacterClass | undefined) ??
              existing.charClass,
            rank: input.rank ?? existing.rank,
            equippedItemLevel: null,
            averageItemLevel: null,
            lastLoginIso: null,
            source: "api",
            status: "PENDING",
            note: input.note ?? existing.note,
          };
          targets.push({
            id: existing.id,
            realm: existing.realm,
            name: existing.name,
          });
          updated++;
        } else {
          const id = `api-${
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2)
          }`;
          const ch: Character = {
            id,
            realm: input.realm,
            name: input.name,
            charClass: (input.charClass as CharacterClass | undefined) ?? null,
            level: input.level ?? null,
            equippedItemLevel: null,
            averageItemLevel: null,
            lastLoginIso: null,
            source: "api",
            status: "PENDING",
            rank: input.rank,
            note: input.note,
            addedAt: new Date().toISOString(),
          };
          next.unshift(ch);
          targets.push({ id, realm: ch.realm, name: ch.name });
          added++;
        }
      }
      set({ characters: next });
      save();
      return { targets, added, updated };
    },

    applyProfile: (id, patch) => {
      set({
        characters: get().characters.map((c) =>
          c.id === id
            ? {
                ...c,
                level: patch.level ?? c.level,
                equippedItemLevel: patch.equippedItemLevel,
                averageItemLevel: patch.averageItemLevel,
                lastLoginIso: patch.lastLoginIso,
                charClass:
                  (patch.charClass as CharacterClass | undefined) ??
                  c.charClass,
                source: "api",
                status: "OK",
              }
            : c,
        ),
      });
      save();
    },

    markError: (id) => {
      set({
        characters: get().characters.map((c) =>
          c.id === id ? { ...c, status: "ERROR" } : c,
        ),
      });
      save();
    },

    startEnrichment: (total) =>
      set({ enrichment: { total, done: 0, startedAt: Date.now() } }),
    tickEnrichment: () => {
      const e = get().enrichment;
      if (!e) return;
      set({ enrichment: { ...e, done: e.done + 1 } });
    },
    endEnrichment: () => set({ enrichment: null }),

    addCharacter: (input) => {
      const existing = get().characters.find((c) => sameCharacter(c, input));
      if (existing) {
        const refreshed = dummyFetch({
          realm: existing.realm,
          name: existing.name,
          charClass: existing.charClass,
          note: input.note ?? existing.note,
        });
        set({
          characters: get().characters.map((c) =>
            c.id === existing.id
              ? { ...refreshed, id: existing.id, addedAt: existing.addedAt }
              : c,
          ),
        });
        save();
        return { ...refreshed, id: existing.id, addedAt: existing.addedAt };
      }
      const fresh = dummyFetch(input);
      set({ characters: [fresh, ...get().characters] });
      save();
      return fresh;
    },

    addMany: (inputs) => {
      let added = 0;
      let duplicates = 0;
      const next = [...get().characters];
      for (const input of inputs) {
        const idx = next.findIndex((c) => sameCharacter(c, input));
        if (idx >= 0) {
          const refreshed = dummyFetch({
            realm: next[idx].realm,
            name: next[idx].name,
            charClass: next[idx].charClass,
            note: input.note ?? next[idx].note,
          });
          next[idx] = {
            ...refreshed,
            id: next[idx].id,
            addedAt: next[idx].addedAt,
          };
          duplicates++;
        } else {
          next.unshift(dummyFetch(input));
          added++;
        }
      }
      set({ characters: next });
      save();
      return { added, duplicates };
    },

    removeCharacter: (id) => {
      set({ characters: get().characters.filter((c) => c.id !== id) });
      save();
    },

    refreshCharacter: (id) => {
      const target = get().characters.find((c) => c.id === id);
      if (!target) return;
      const refreshed = dummyFetch({
        realm: target.realm,
        name: target.name,
        charClass: target.charClass,
        note: target.note,
      });
      set({
        characters: get().characters.map((c) =>
          c.id === id
            ? { ...refreshed, id: target.id, addedAt: target.addedAt }
            : c,
        ),
      });
      save();
    },

    refreshAll: () => {
      set({
        characters: get().characters.map((c) => {
          const refreshed = dummyFetch({
            realm: c.realm,
            name: c.name,
            charClass: c.charClass,
            note: c.note,
          });
          return { ...refreshed, id: c.id, addedAt: c.addedAt };
        }),
      });
      save();
    },

    retryErrors: async () => {
      const errored = get().characters.filter((c) => c.status === "ERROR");
      if (errored.length === 0) return;
      const targets: PendingTarget[] = errored.map((c) => ({
        id: c.id,
        realm: c.realm,
        name: c.name,
      }));
      set({
        characters: get().characters.map((c) =>
          c.status === "ERROR" ? { ...c, status: "PENDING" } : c,
        ),
      });
      save();
      get().startEnrichment(targets.length);
      await enrichRoster(targets, {
        onOk: (id, data) => get().applyProfile(id, data),
        onError: (id) => get().markError(id),
        onProgress: () => get().tickEnrichment(),
      });
      get().endEnrichment();
    },

    clearAll: () => {
      set({ characters: [] });
      save();
    },
  };
});
