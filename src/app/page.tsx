"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useGuildStore } from "@/lib/store";
import { CharacterTable } from "@/components/CharacterTable";
import { FilterBar } from "@/components/FilterBar";
import { Stat } from "@/components/Stat";
import type { SortDir, SortField } from "@/lib/types";
import { daysSince, formatKst } from "@/lib/format";
import { toCsv, downloadBlob } from "@/lib/csv";

export default function DashboardPage() {
  const characters = useGuildStore((s) => s.characters);
  const removeCharacter = useGuildStore((s) => s.removeCharacter);
  const refreshCharacter = useGuildStore((s) => s.refreshCharacter);
  const refreshAll = useGuildStore((s) => s.refreshAll);
  const retryErrors = useGuildStore((s) => s.retryErrors);
  const resetToSeed = useGuildStore((s) => s.resetToSeed);
  const clearAll = useGuildStore((s) => s.clearAll);
  const adminMode = useGuildStore((s) => s.adminMode);
  const staleDays = useGuildStore((s) => s.staleDays);
  const setStaleDays = useGuildStore((s) => s.setStaleDays);
  const lastUpdatedAt = useGuildStore((s) => s.lastUpdatedAt);
  const hydrated = useGuildStore((s) => s.hydrated);

  const [search, setSearch] = useState("");
  const [realmFilter, setRealmFilter] = useState("");
  const [sortField, setSortField] = useState<SortField>("equippedItemLevel");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [staleOnly, setStaleOnly] = useState(false);
  const [errorOnly, setErrorOnly] = useState(false);

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
        if (d === null || d < staleDays) return false;
      }
      if (errorOnly && c.status !== "ERROR") return false;
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
  }, [characters, search, realmFilter, sortField, sortDir, staleOnly, errorOnly, staleDays]);

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
      return d !== null && d >= staleDays;
    }).length;
    const errors = characters.filter((c) => c.status === "ERROR").length;
    return { total: characters.length, avg, stale, errors };
  }, [characters, staleDays]);

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
              총 {characters.length}명
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              마지막 갱신:{" "}
              {!hydrated
                ? "불러오는 중…"
                : lastUpdatedAt
                  ? formatKst(lastUpdatedAt)
                  : "-"}
            </p>
          </div>
          <Link
            href="/add"
            className="rounded-md bg-brand-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            길드원 갱신
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="등록된 캐릭터" value={stats.total} />
          <Stat label="평균 템렙 (OK)" value={stats.avg || "-"} />
          <Stat
            label={`${staleDays}일+ 미접속`}
            value={stats.stale}
            tone={stats.stale > 0 ? "warn" : "default"}
            onClick={() => setStaleOnly((v) => !v)}
            active={staleOnly}
          />
          <Stat
            label="조회 실패"
            value={stats.errors}
            tone={stats.errors > 0 ? "bad" : "default"}
            onClick={() => setErrorOnly((v) => !v)}
            active={errorOnly}
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
          staleDays={staleDays}
          onStaleDaysChange={setStaleDays}
        />

        <div className="flex flex-wrap items-center gap-2">
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
          {adminMode && (
            <>
              <button
                type="button"
                onClick={refreshAll}
                className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-400/20"
              >
                전체 재조회
              </button>
              <button
                type="button"
                onClick={() => void retryErrors()}
                disabled={stats.errors === 0}
                className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                실패 항목 재시도 ({stats.errors})
              </button>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        "시드 데이터로 되돌리시겠습니까? 현재 변경사항이 사라집니다.",
                      )
                    ) {
                      resetToSeed();
                    }
                  }}
                  className="rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-400/20"
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
            </>
          )}
        </div>

        <CharacterTable
          rows={visible}
          adminMode={adminMode}
          onDelete={removeCharacter}
          onRefresh={refreshCharacter}
          staleDays={staleDays}
        />
        <p className="text-xs text-[var(--text-muted)]">
          보이는 행: {visible.length} / {characters.length}
        </p>
      </section>
    </div>
  );
}
