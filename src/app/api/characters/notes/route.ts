import { NextResponse } from "next/server";
import { isConfigured, loadCharacters, saveCharacters } from "@/lib/serverStore";

export const runtime = "nodejs";

interface IncomingMember {
  id?: string;
  realm?: string;
  name?: string;
  publicNote?: string;
  rank?: string;
  rankIndex?: number;
  level?: number;
  charClass?: string;
  isOnline?: boolean;
}

interface NotesPayload {
  source?: string;
  schemaVersion?: number;
  capturedAt?: string;
  guildName?: string;
  realm?: string;
  members?: IncomingMember[];
}

// 페이로드의 realm("Azshara", "Burning Steppes")을 우리 store의 realm slug
// ("azshara", "burning-steppes")와 비교 가능한 형태로 정규화.
// companion/payload.py:_slugify 와 같은 규칙 (a-z0-9가-힣 + 하이픈만 허용).
function slugifyRealm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s']+/g, "-")
    .replace(/[^a-z0-9가-힣\-]+/g, "");
}

function matchKey(realm: string, name: string): string {
  return `${slugifyRealm(realm)}::${name.trim().toLowerCase()}`;
}

export async function POST(req: Request) {
  // GUILDMEMO_TOKEN 이 서버에 설정돼 있으면 Bearer 검증, 없으면 dev/오픈 모드.
  const expected = process.env.GUILDMEMO_TOKEN;
  if (expected) {
    const auth = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== expected) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
  }

  if (!isConfigured()) {
    return NextResponse.json(
      { error: "REDIS_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: NotesPayload;
  try {
    body = (await req.json()) as NotesPayload;
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const members = Array.isArray(body.members) ? body.members : null;
  if (!members) {
    return NextResponse.json(
      { error: "INVALID_PAYLOAD", message: "members 배열이 필요합니다." },
      { status: 400 },
    );
  }

  const state = await loadCharacters();
  const existing = state?.characters ?? [];

  // (slugifiedRealm + lowerName) → 기존 character index
  const lookup = new Map<string, number>();
  existing.forEach((c, i) => {
    lookup.set(matchKey(c.realm, c.name), i);
  });

  const next = [...existing];
  const unmatched: { realm: string; name: string }[] = [];
  let matched = 0;
  let cleared = 0;

  for (const m of members) {
    const realm = (m.realm ?? body.realm ?? "").trim();
    const name = (m.name ?? "").trim();
    if (!name) continue;

    const idx = lookup.get(matchKey(realm, name));
    if (idx === undefined) {
      unmatched.push({ realm, name });
      continue;
    }

    const note = (m.publicNote ?? "").trim();
    next[idx] = { ...next[idx], note: note || undefined };
    matched++;
    if (!note) cleared++;
  }

  // matched가 0이면 굳이 Redis에 다시 쓸 필요 없음 (잡 호출 비용 절약)
  let updatedAt: string | null = state?.updatedAt ?? null;
  if (matched > 0) {
    const newState = await saveCharacters(next);
    updatedAt = newState.updatedAt;
  }

  return NextResponse.json({
    matched,
    cleared,
    unmatched,
    total: members.length,
    updatedAt,
    capturedAt: body.capturedAt ?? null,
  });
}
