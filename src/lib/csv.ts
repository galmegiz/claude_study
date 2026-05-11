import type { CharacterInput, CharacterClass, Character } from "./types";

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

export function isCharacterClass(value: string): value is CharacterClass {
  return (CLASSES as string[]).includes(value);
}

export interface CsvParseResult {
  inputs: CharacterInput[];
  errors: { line: number; message: string }[];
}

export function parseCsv(input: string): CsvParseResult {
  const result: CsvParseResult = { inputs: [], errors: [] };
  const raw = input.replace(/^﻿/, "");
  const lines = raw.split(/\r?\n/).map((l) => l.trim());
  const nonEmpty = lines.filter((l) => l.length > 0 && !l.startsWith("#"));
  if (nonEmpty.length === 0) return result;

  const header = splitRow(nonEmpty[0]).map((c) => c.trim().toLowerCase());
  const realmIdx = findColumn(header, ["realm", "서버명", "서버"]);
  const nameIdx = findColumn(header, ["name", "계정명", "캐릭터명", "캐릭명"]);
  const classIdx = findColumn(header, ["class", "직업"]);
  const noteIdx = findColumn(header, ["note", "메모"]);

  if (realmIdx < 0 || nameIdx < 0) {
    result.errors.push({
      line: 1,
      message:
        "헤더에 서버(realm/서버명)와 캐릭터(name/계정명) 컬럼이 필요합니다.",
    });
    return result;
  }

  for (let i = 1; i < nonEmpty.length; i++) {
    const row = splitRow(nonEmpty[i]);
    const realm = row[realmIdx]?.trim();
    const name = row[nameIdx]?.trim();
    if (!realm || !name) {
      result.errors.push({ line: i + 1, message: "서버 또는 캐릭터명이 비어 있음" });
      continue;
    }
    const rawClass = classIdx >= 0 ? row[classIdx]?.trim() : "";
    const charClass =
      rawClass && isCharacterClass(rawClass) ? rawClass : undefined;
    if (rawClass && !charClass) {
      result.errors.push({
        line: i + 1,
        message: `알 수 없는 직업: '${rawClass}'. 빈 값으로 처리합니다.`,
      });
    }
    const note = noteIdx >= 0 ? row[noteIdx]?.trim() : "";
    result.inputs.push({
      realm,
      name,
      charClass,
      note: note || undefined,
    });
  }
  return result;
}

function findColumn(header: string[], aliases: string[]): number {
  for (const a of aliases) {
    const i = header.indexOf(a.toLowerCase());
    if (i >= 0) return i;
  }
  return -1;
}

function splitRow(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"' && inQuotes && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

export function toCsv(rows: Character[]): string {
  const header =
    "id,realm,name,class,level,equipped_item_level,average_item_level,last_login,source,status,note";
  const body = rows
    .map((r) =>
      [
        r.id,
        r.realm,
        r.name,
        r.charClass,
        r.level ?? "",
        r.equippedItemLevel ?? "",
        r.averageItemLevel ?? "",
        r.lastLoginIso ?? "",
        r.source,
        r.status,
        r.note ?? "",
      ]
        .map(cell)
        .join(","),
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

function cell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function downloadBlob(filename: string, content: string, mime: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
