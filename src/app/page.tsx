"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGuildStore } from "@/lib/store";
import { CharacterTable } from "@/components/CharacterTable";
import { FilterBar } from "@/components/FilterBar";
import { Stat } from "@/components/Stat";
import type { SortDir, SortField } from "@/lib/types";
import { daysSince } from "@/lib/format";
import { toCsv, downloadBlob } from "@/lib/csv";

export default function DashboardPage() {
  const characters = useGuildStore((s) => s.characters);
  const removeCharacter = useGuildStore((s) => s.removeCharacter);
  const refreshCharacter = useGuildStore((s) => s.refreshCharacter);
  const refreshAll = useGuildStore((s) => s.refreshAll);
  const resetToSeed = useGuildStore((s) => s.resetToSeed);
  const clearAll = useGuildStore((s) => s.clearAll);

  const [search, setSearch] = useState("");
  const [realmFilter, setRealmFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("equippedItemLevel");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [staleOnly, setStaleOnly] = useState(false);

  const realms = useMemo(
    () => Array.from(new Set(characters.map((c) => c.realm))).sort(),
    [characters],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = characters.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.realm.toLowerCase().includes(q))
        return false;
      if (realmFilter && c.realm !== realmFilter) return false;
      if (staleOnly) {
        const d = daysSince(c.lastLoginIso);
        if (d === null || d < 14) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    filtered.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv), "ko") * dir;
    });
    return filtered;
  }, [characters, search, realmFilter, sortField, sortDir, staleOnly]);

  const stats = useMemo(() => {
    const ok = characters.filter((c) => c.status === "OK");
    const avg =
      ok.length === 0
        ? 0
        : Math.round(
            ok.reduce((sum, c) => sum + (c.equippedItemLevel ?? 0), 0) / ok.length,
          );
    const stale = characters.filter((c) => {
      const d = daysSince(c.lastLoginIso);
      return d !== null && d >= 14;
    }).length;
    const errors = characters.filter((c) => c.status === "ERROR").length;
    return { total: characters.length, avg, stale, errors };
  }, [characters]);

  const handleExportCsv = () => {
    downloadBlob("guild-characters.csv", toCsv(visible), "text/csv;charset=utf-8");
  };

  const handleExportJson = () => {
    downloadBlob(
      "guild-characters.json",
      JSON.stringify(visible, null, 2),
      "application/json;charset=utf-8",
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">길드원 대시보드</h1>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              총 {characters.length}명 · 더미 데이터 기반. 값은 재조회 시 랜덤 갱신됩니다.
            </p>
          </div>
          <Link
            href="/add"
            className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + 캐릭터 추가
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="등록된 캐릭터" value={stats.total} />
          <Stat label="평균 템렙 (OK)" value={stats.avg || "-"} />
          <Stat
            label="14일+ 미접속"
            value={stats.stale}
            tone={stats.stale > 0 ? "warn" : "default"}
          />
          <Stat
            label="조회 실패"
            value={stats.errors}
            tone={stats.errors > 0 ? "bad" : "default"}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <FilterBar
          search={search}
          onSearch={setSearch}
          realmFilter={realmFilter}
          onRealmFilter={setRealmFilter}
          realms={realms}
          sortField={sortField}
          sortDir={sortDir}
          onSortField={setSortField}
          onToggleDir={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
          staleOnly={staleOnly}
          onToggleStale={() => setStaleOnly((v) => !v)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={refreshAll}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
          >
            전체 재조회
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
          >
            CSV 내보내기
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
          >
            JSON 내보내기
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm("시드 데이터로 되돌리시겠습니까? 현재 변경사항이 사라집니다.")) {
                  resetToSeed();
                }
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            >
              시드로 리셋
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("모든 캐릭터를 삭제하시겠습니까?")) clearAll();
              }}
              className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-400 hover:bg-rose-500/20"
            >
              전체 삭제
            </button>
          </div>
        </div>

        <CharacterTable
          rows={visible}
          onDelete={removeCharacter}
          onRefresh={refreshCharacter}
        />
        <p className="text-xs text-[var(--text-muted)]">
          보이는 행: {visible.length} / {characters.length}
        </p>
      </section>
    </div>
  );
}
