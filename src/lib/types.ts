export type CharacterClass =
  | "전사"
  | "성기사"
  | "사냥꾼"
  | "도적"
  | "사제"
  | "주술사"
  | "마법사"
  | "흑마법사"
  | "죽음의기사"
  | "드루이드"
  | "기원사"
  | "악마사냥꾼"
  | "수도사";

export type SourceKind = "api" | "armory" | "dummy";

export type FetchStatus = "OK" | "PENDING" | "ERROR";

export interface Character {
  id: string;
  realm: string;
  name: string;
  charClass: CharacterClass;
  level: number | null;
  equippedItemLevel: number | null;
  averageItemLevel: number | null;
  lastLoginIso: string | null;
  source: SourceKind;
  status: FetchStatus;
  note?: string;
  addedAt: string;
}

export interface CharacterInput {
  realm: string;
  name: string;
  charClass?: CharacterClass;
  note?: string;
}

export type SortField =
  | "name"
  | "realm"
  | "level"
  | "equippedItemLevel"
  | "lastLoginIso";

export type SortDir = "asc" | "desc";
