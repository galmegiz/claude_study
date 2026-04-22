"use client";

import { useState } from "react";
import type { CharacterClass, CharacterInput } from "@/lib/types";

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

const REALM_SUGGESTIONS = [
  "azshara",
  "hyjal",
  "durotan",
  "windrunner",
  "burning-legion",
  "cenarius",
  "dalaran",
  "deathwing",
  "garona",
  "hellscream",
  "malfurion",
  "rexxar",
  "wildhammer",
];

interface Props {
  onSubmit: (input: CharacterInput) => void;
}

export function AddForm({ onSubmit }: Props) {
  const [realm, setRealm] = useState("azshara");
  const [name, setName] = useState("");
  const [charClass, setCharClass] = useState<CharacterClass | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const r = realm.trim();
    const n = name.trim();
    if (!r) return setError("서버(realm slug)를 입력하세요.");
    if (!n) return setError("캐릭터 이름을 입력하세요.");
    setError(null);
    onSubmit({
      realm: r,
      name: n,
      charClass: charClass || undefined,
      note: note.trim() || undefined,
    });
    setName("");
    setNote("");
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">서버 (realm slug)</span>
          <input
            list="realm-list"
            value={realm}
            onChange={(e) => setRealm(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            placeholder="azshara"
          />
          <datalist id="realm-list">
            {REALM_SUGGESTIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">캐릭터 이름</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            placeholder="차넬"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">직업 (선택)</span>
          <select
            value={charClass}
            onChange={(e) => setCharClass(e.target.value as CharacterClass | "")}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
          >
            <option value="">자동 추정</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">메모 (선택)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
            placeholder="예: 길드마스터, 메인 딜러, 휴면 등"
          />
        </label>
      </div>

      {error && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          이미 등록된 (서버+이름) 조합이면 재조회로 값을 갱신합니다.
        </p>
        <button
          type="submit"
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
        >
          추가하기
        </button>
      </div>
    </form>
  );
}
