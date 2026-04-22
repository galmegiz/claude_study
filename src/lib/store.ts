"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import seedData from "../../data/characters.json";
import type { Character, CharacterInput } from "./types";
import { dummyFetch } from "./dummyFetch";

const SEED: Character[] = seedData as Character[];

interface GuildState {
  characters: Character[];
  hydrated: boolean;
  setHydrated: () => void;
  addCharacter: (input: CharacterInput) => Character;
  addMany: (inputs: CharacterInput[]) => { added: number; duplicates: number };
  removeCharacter: (id: string) => void;
  refreshCharacter: (id: string) => void;
  refreshAll: () => void;
  resetToSeed: () => void;
  clearAll: () => void;
}

function sameCharacter(a: { realm: string; name: string }, b: CharacterInput) {
  return (
    a.realm.trim().toLowerCase() === b.realm.trim().toLowerCase() &&
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  );
}

export const useGuildStore = create<GuildState>()(
  persist(
    (set, get) => ({
      characters: SEED,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),

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
          return { ...refreshed, id: existing.id, addedAt: existing.addedAt };
        }
        const fresh = dummyFetch(input);
        set({ characters: [fresh, ...get().characters] });
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
        return { added, duplicates };
      },

      removeCharacter: (id) =>
        set({ characters: get().characters.filter((c) => c.id !== id) }),

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
      },

      resetToSeed: () => set({ characters: SEED }),

      clearAll: () => set({ characters: [] }),
    }),
    {
      name: "wow-guild-store:v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ characters: s.characters }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => state?.setHydrated?.(),
    },
  ),
);
