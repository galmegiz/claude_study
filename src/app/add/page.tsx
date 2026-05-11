"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGuildStore } from "@/lib/store";
import { AddForm } from "@/components/AddForm";
import { CsvUpload } from "@/components/CsvUpload";
import { GuildImport } from "@/components/GuildImport";

export default function AddPage() {
  const addCharacter = useGuildStore((s) => s.addCharacter);
  const addMany = useGuildStore((s) => s.addMany);
  const adminMode = useGuildStore((s) => s.adminMode);
  const router = useRouter();

  const [mode, setMode] = useState<"form" | "csv" | "guild">("guild");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!adminMode && mode !== "guild") setMode("guild");
  }, [adminMode, mode]);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/"
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← 대시보드로
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          길드원 갱신
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          전투정보실 길드 페이지로부터 길드원 목록을 가져옵니다.
          {adminMode &&
            " 관리자 모드에서는 수기 입력 / CSV 업로드 탭도 사용할 수 있습니다."}
        </p>
      </div>

      <div className="inline-flex gap-1 self-start rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1 text-sm">
        <Tab active={mode === "guild"} onClick={() => setMode("guild")}>
          길드 페이지에서 가져오기
        </Tab>
        {adminMode && (
          <>
            <Tab active={mode === "form"} onClick={() => setMode("form")}>
              수기 입력
            </Tab>
            <Tab active={mode === "csv"} onClick={() => setMode("csv")}>
              CSV 업로드
            </Tab>
          </>
        )}
      </div>

      {mode === "form" && (
        <AddForm
          onSubmit={(input) => {
            const result = addCharacter(input);
            flash(
              result.status === "OK"
                ? `'${result.name}' (${result.realm}) 추가 · Lv${result.level} iLvl${result.equippedItemLevel}`
                : `'${result.name}' 조회 실패 — ERROR로 기록됨`,
            );
          }}
        />
      )}
      {mode === "csv" && (
        <CsvUpload
          onSubmit={(inputs) => {
            const { added, duplicates } = addMany(inputs);
            flash(
              `일괄 추가 완료 · 신규 ${added}명 · 중복(갱신) ${duplicates}명`,
            );
          }}
        />
      )}
      {mode === "guild" && (
        <GuildImport onImportComplete={(msg) => flash(msg)} />
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm hover:bg-[var(--surface-muted)]"
        >
          대시보드에서 확인
        </button>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md bg-brand-500 px-3 py-1.5 font-medium text-white"
          : "rounded-md px-3 py-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-muted)]"
      }
    >
      {children}
    </button>
  );
}
