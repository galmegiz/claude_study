"use client";

import type { Character } from "@/lib/types";
import { formatKst, daysSince, cx } from "@/lib/format";

interface Props {
  rows: Character[];
  onDelete: (id: string) => void;
  onRefresh: (id: string) => void;
}

export function CharacterTable({ rows, onDelete, onRefresh }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center text-sm text-[var(--text-muted)]">
        표시할 캐릭터가 없습니다. 상단의 &ldquo;캐릭터 추가&rdquo;에서 등록해 보세요.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]">
          <tr>
            <Th>이름</Th>
            <Th>서버</Th>
            <Th>직업</Th>
            <Th className="text-right">Lv</Th>
            <Th className="text-right">템렙(착용)</Th>
            <Th className="text-right">템렙(평균)</Th>
            <Th>최종접속</Th>
            <Th>상태</Th>
            <Th className="text-right">액션</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const stale = daysSince(c.lastLoginIso);
            const staleTone =
              stale === null
                ? "text-[var(--text-muted)]"
                : stale >= 30
                  ? "text-rose-400"
                  : stale >= 14
                    ? "text-amber-400"
                    : "text-emerald-400";

            return (
              <tr
                key={c.id}
                className="border-t border-[var(--border)] hover:bg-[var(--surface-muted)]"
              >
                <Td>
                  <div className="font-medium">{c.name}</div>
                  {c.note && (
                    <div className="text-xs text-[var(--text-muted)]">{c.note}</div>
                  )}
                </Td>
                <Td>{c.realm}</Td>
                <Td>{c.charClass}</Td>
                <Td className="text-right tabular-nums">{c.level ?? "-"}</Td>
                <Td className="text-right tabular-nums font-medium">
                  {c.equippedItemLevel ?? "-"}
                </Td>
                <Td className="text-right tabular-nums text-[var(--text-muted)]">
                  {c.averageItemLevel ?? "-"}
                </Td>
                <Td>
                  <div className={cx("tabular-nums", staleTone)}>
                    {formatKst(c.lastLoginIso)}
                  </div>
                  {stale !== null && (
                    <div className="text-xs text-[var(--text-muted)]">
                      {stale === 0 ? "오늘" : `${stale}일 전`}
                    </div>
                  )}
                </Td>
                <Td>
                  <StatusBadge status={c.status} source={c.source} />
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <button
                    type="button"
                    onClick={() => onRefresh(c.id)}
                    className="rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                  >
                    재조회
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`'${c.name}' 을(를) 삭제하시겠습니까?`)) {
                        onDelete(c.id);
                      }
                    }}
                    className="ml-1 rounded px-2 py-1 text-xs text-rose-400 hover:bg-rose-500/10"
                  >
                    삭제
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cx(
        "px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider",
        className,
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cx("px-3 py-2 align-top", className)}>{children}</td>;
}

function StatusBadge({
  status,
  source,
}: {
  status: Character["status"];
  source: Character["source"];
}) {
  const map = {
    OK: "bg-emerald-500/10 text-emerald-400",
    ERROR: "bg-rose-500/10 text-rose-400",
    PENDING: "bg-amber-500/10 text-amber-400",
  } as const;
  return (
    <div className="flex items-center gap-1">
      <span className={cx("rounded px-2 py-0.5 text-xs", map[status])}>
        {status}
      </span>
      <span className="text-[10px] uppercase text-[var(--text-muted)]">
        {source}
      </span>
    </div>
  );
}
