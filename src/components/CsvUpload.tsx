"use client";

import { useState } from "react";
import type { CharacterInput } from "@/lib/types";
import { parseCsv } from "@/lib/csv";

interface Props {
  onSubmit: (inputs: CharacterInput[]) => void;
}

const SAMPLE = `서버명,계정명
azshara,차넬
hyjal,홀리차넬
durotan,도적님
azshara,번달
`;

export function CsvUpload({ onSubmit }: Props) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<CharacterInput[]>([]);
  const [errors, setErrors] = useState<{ line: number; message: string }[]>([]);

  const handleFile = async (file: File) => {
    const content = await file.text();
    setText(content);
    preview(content);
  };

  const preview = (content: string) => {
    const r = parseCsv(content);
    setParsed(r.inputs);
    setErrors(r.errors);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm hover:bg-[var(--surface)]">
          <span>파일 선택</span>
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            setText(SAMPLE);
            preview(SAMPLE);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm hover:bg-[var(--surface)]"
        >
          샘플 채우기
        </button>
        <button
          type="button"
          onClick={() => {
            setText("");
            setParsed([]);
            setErrors([]);
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-sm text-[var(--text-muted)] hover:bg-[var(--surface)]"
        >
          지우기
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          preview(e.target.value);
        }}
        placeholder={"헤더 포함 CSV를 붙여넣거나 파일로 업로드하세요.\n예) 서버명,계정명"}
        rows={8}
        className="rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs"
      />

      {errors.length > 0 && (
        <ul className="rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
          {errors.map((e, i) => (
            <li key={i}>
              line {e.line}: {e.message}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          {parsed.length > 0
            ? `파싱된 행 ${parsed.length}개 · 중복 (서버+캐릭터명)은 재조회로 처리됩니다.`
            : "필수 헤더: 서버명, 계정명 (영문 realm,name 도 허용). 직업·메모는 선택."}
        </p>
        <button
          type="button"
          disabled={parsed.length === 0}
          onClick={() => {
            onSubmit(parsed);
            setText("");
            setParsed([]);
            setErrors([]);
          }}
          className="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          일괄 추가 ({parsed.length})
        </button>
      </div>

      {parsed.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-[var(--border)]">
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--surface-muted)] text-[var(--text-muted)]">
              <tr>
                <th className="px-2 py-1 text-left">서버명</th>
                <th className="px-2 py-1 text-left">계정명</th>
                <th className="px-2 py-1 text-left">직업</th>
                <th className="px-2 py-1 text-left">메모</th>
              </tr>
            </thead>
            <tbody>
              {parsed.slice(0, 20).map((p, i) => (
                <tr key={i} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1 font-mono">{p.realm}</td>
                  <td className="px-2 py-1">{p.name}</td>
                  <td className="px-2 py-1">{p.charClass ?? "-"}</td>
                  <td className="px-2 py-1 text-[var(--text-muted)]">
                    {p.note ?? ""}
                  </td>
                </tr>
              ))}
              {parsed.length > 20 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-2 py-1 text-center text-[var(--text-muted)]"
                  >
                    … 외 {parsed.length - 20}개
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
