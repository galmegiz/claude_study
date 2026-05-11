"use client";

import { useEffect, useState } from "react";
import type { CharacterClass } from "@/lib/types";
import type { GuildMember } from "@/lib/guildRoster";
import { useGuildStore } from "@/lib/store";
import { enrichRoster } from "@/lib/enrichRoster";

interface FetchResult {
  realm: string;
  guild: string;
  members: GuildMember[];
  source: "api" | "dummy";
  fetchedAt: string;
  cached?: boolean;
  cachedAgeMs?: number;
  summary: {
    total: number;
    guildName: string;
    realmName: string;
    faction: string;
  };
}

interface Props {
  onImportComplete: (msg: string) => void;
}

const EXAMPLE_URL =
  "https://worldofwarcraft.blizzard.com/ko-kr/guild/kr/azshara/nnde/";

export function GuildImport({ onImportComplete }: Props) {
  const addPending = useGuildStore((s) => s.addPending);
  const applyProfile = useGuildStore((s) => s.applyProfile);
  const markError = useGuildStore((s) => s.markError);
  const startEnrichment = useGuildStore((s) => s.startEnrichment);
  const tickEnrichment = useGuildStore((s) => s.tickEnrichment);
  const endEnrichment = useGuildStore((s) => s.endEnrichment);
  const adminMode = useGuildStore((s) => s.adminMode);
  const [mode, setMode] = useState<"url" | "manual">(
    adminMode ? "url" : "manual",
  );
  useEffect(() => {
    if (!adminMode && mode === "url") setMode("manual");
  }, [adminMode, mode]);
  const [url, setUrl] = useState(EXAMPLE_URL);
  const [realm, setRealm] = useState("azshara");
  const [guild, setGuild] = useState("nnde");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState("");

  const fetchRoster = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const body =
        mode === "url"
          ? { url: url.trim() }
          : { realm: realm.trim(), guild: guild.trim() };
      const resp = await fetch("/api/guild-roster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || `HTTP ${resp.status}`);
        return;
      }
      setResult(data as FetchResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const importAll = async () => {
    if (!result) return;

    const { targets, added, updated } = addPending(
      result.members.map((m) => ({
        realm: m.realm,
        name: m.name,
        level: m.level,
        charClass: m.charClass as CharacterClass | undefined,
        rank: m.rank,
      })),
    );

    setResult(null);
    setNameFilter("");

    if (result.source !== "api") {
      onImportComplete(
        `더미 ${targets.length}명 추가 · 상세 갱신은 실제 API 자격증명이 있을 때만 동작.`,
      );
      return;
    }

    if (targets.length === 0) {
      onImportComplete("추가할 길드원이 없습니다.");
      return;
    }

    onImportComplete(
      `${targets.length}명 등록 (신규 ${added}, 갱신 ${updated}) — 백그라운드에서 상세 정보 갱신 중…`,
    );

    startEnrichment(targets.length);
    let okCount = 0;
    let errCount = 0;

    await enrichRoster(targets, {
      onOk: (id, data) => {
        okCount++;
        applyProfile(id, data);
      },
      onError: (id) => {
        errCount++;
        markError(id);
      },
      onProgress: () => tickEnrichment(),
    });

    endEnrichment();
    onImportComplete(
      `상세 갱신 완료 · OK ${okCount}명 · 실패 ${errCount}명`,
    );
  };

  const visibleMembers = result
    ? result.members.filter((m) =>
        nameFilter.trim()
          ? m.name.toLowerCase().includes(nameFilter.trim().toLowerCase())
          : true,
      )
    : [];
  const preview = visibleMembers.slice(0, 50);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-[var(--text-muted)]">입력 방식:</span>
        {adminMode ? (
          <button
            type="button"
            onClick={() => setMode("url")}
            className={
              mode === "url"
                ? "rounded bg-brand-500 px-2 py-1 text-white"
                : "rounded border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
            }
          >
            전투정보실 URL
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] opacity-50"
            title="관리자 모드에서만 사용 가능"
          >
            전투정보실 URL (관리자 전용)
          </button>
        )}
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={
            mode === "manual"
              ? "rounded bg-brand-500 px-2 py-1 text-white"
              : "rounded border border-[var(--border)] px-2 py-1 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
          }
        >
          서버 + 길드 slug
        </button>
      </div>

      {mode === "url" ? (
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--text-muted)]">길드 페이지 URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={EXAMPLE_URL}
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs"
          />
        </label>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-muted)]">서버 (realm slug)</span>
            <input
              value={realm}
              onChange={(e) => setRealm(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
              placeholder="azshara"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--text-muted)]">길드 slug</span>
            <input
              value={guild}
              onChange={(e) => setGuild(e.target.value)}
              className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2"
              placeholder="nnde"
            />
          </label>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-[var(--text-muted)]">
          서버 환경변수에 <code className="font-mono">BLIZZARD_CLIENT_ID</code> /
          <code className="font-mono">BLIZZARD_CLIENT_SECRET</code> 설정 시 실제
          Blizzard API 사용, 없으면 더미 폴백.
        </p>
        <button
          type="button"
          onClick={fetchRoster}
          disabled={loading}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "조회 중…" : "길드원 정보 갱신"}
        </button>
      </div>

      {error && (
        <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-400">
          {error}
        </p>
      )}

      {result && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <span>
              <span className="font-semibold">{result.summary.guildName}</span>
              {" · "}
              {result.summary.realmName}
              {result.summary.faction ? ` · ${result.summary.faction}` : ""}
              {" · "}
              총 {result.summary.total}명
              <span className="ml-2 text-[10px] uppercase">
                [{result.source}]
              </span>
              {result.cached && (
                <span className="ml-1 rounded bg-emerald-500/20 px-1 text-[10px] uppercase">
                  cache {Math.round((result.cachedAgeMs ?? 0) / 1000)}s ago
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={importAll}
              className="rounded bg-emerald-500 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600"
            >
              전체 추가 ({result.members.length})
            </button>
          </div>

          <input
            value={nameFilter}
            onChange={(e) => setNameFilter(e.target.value)}
            placeholder="이름으로 필터 (예: 알까기)"
            className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm"
          />

          <div className="overflow-x-auto rounded-md border border-[var(--border)]">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-2 py-1 text-left">서버명</th>
                  <th className="px-2 py-1 text-left">계정명</th>
                  <th className="px-2 py-1 text-right">Lv</th>
                  <th className="px-2 py-1 text-left">직업</th>
                  <th className="px-2 py-1 text-right">랭크</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((m, i) => (
                  <tr key={i} className="border-t border-[var(--border)]">
                    <td className="px-2 py-1 font-mono">{m.realm}</td>
                    <td className="px-2 py-1">{m.name}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {m.level ?? "-"}
                    </td>
                    <td className="px-2 py-1">{m.charClass ?? "-"}</td>
                    <td className="px-2 py-1 text-right tabular-nums">
                      {m.rank ?? "-"}
                    </td>
                  </tr>
                ))}
                {visibleMembers.length > preview.length && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-1 text-center text-[var(--text-muted)]"
                    >
                      … 외 {visibleMembers.length - preview.length}개
                      (전체 추가 시 모두 반영)
                    </td>
                  </tr>
                )}
                {visibleMembers.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-2 py-1 text-center text-[var(--text-muted)]"
                    >
                      필터에 일치하는 길드원이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
