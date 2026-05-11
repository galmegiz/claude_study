"use client";

import { useGuildStore } from "@/lib/store";

export function EnrichmentBanner() {
  const enrichment = useGuildStore((s) => s.enrichment);
  if (!enrichment) return null;

  const { total, done, startedAt } = enrichment;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const elapsed = (Date.now() - startedAt) / 1000;
  const etaSec =
    done > 0 ? Math.max(0, Math.round((elapsed * (total - done)) / done)) : null;

  return (
    <div className="border-b border-amber-400/30 bg-amber-400/10 text-amber-200">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-6 py-2 text-xs">
        <span className="font-medium">API 상세 갱신 중…</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-amber-400/20">
          <div
            className="h-full bg-amber-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="tabular-nums">
          {done}/{total} ({pct}%
          {etaSec !== null ? `, 남은 시간 ~${etaSec}초` : ""})
        </span>
      </div>
    </div>
  );
}
