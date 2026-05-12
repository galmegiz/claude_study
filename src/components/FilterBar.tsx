"use client";

import type { SortField, SortDir } from "@/lib/types";
import { STALE_DAYS } from "@/lib/format";

interface Props {
  search: string;
  onSearch: (v: string) => void;
  realmFilter: string;
  onRealmFilter: (v: string) => void;
  realms: string[];
  sortField: SortField;
  sortDir: SortDir;
  onSortField: (v: SortField) => void;
  onToggleDir: () => void;
  staleOnly: boolean;
  onToggleStale: () => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: "name", label: "이름" },
  { value: "realm", label: "서버" },
  { value: "level", label: "레벨" },
  { value: "equippedItemLevel", label: "템렙" },
  { value: "lastLoginIso", label: "최종접속" },
];

export function FilterBar(props: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2">
      <input
        type="text"
        placeholder="이름 또는 서버 검색"
        value={props.search}
        onChange={(e) => props.onSearch(e.target.value)}
        className="min-w-[180px] flex-1 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-brand-500 focus:outline-none"
      />

      <select
        value={props.realmFilter}
        onChange={(e) => props.onRealmFilter(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
      >
        <option value="">모든 서버</option>
        {props.realms.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <label className="text-xs text-[var(--text-muted)]">정렬</label>
        <select
          value={props.sortField}
          onChange={(e) => props.onSortField(e.target.value as SortField)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={props.onToggleDir}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1.5 text-sm hover:bg-[var(--surface)]"
          aria-label="정렬 방향 전환"
          title={props.sortDir === "asc" ? "오름차순" : "내림차순"}
        >
          {props.sortDir === "asc" ? "↑" : "↓"}
        </button>
      </div>

      <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm text-[var(--text-muted)]">
        <input
          type="checkbox"
          checked={props.staleOnly}
          onChange={props.onToggleStale}
          className="h-4 w-4 accent-brand-500"
        />
        {STALE_DAYS}일 이상 미접속만
      </label>
    </div>
  );
}
