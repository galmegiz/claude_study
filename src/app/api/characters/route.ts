import { NextResponse } from "next/server";
import {
  isConfigured,
  loadCharacters,
  saveCharacters,
} from "@/lib/serverStore";
import type { Character } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "서버 스토리지(Redis)가 설정되지 않았습니다." },
      { status: 503 },
    );
  }
  const state = await loadCharacters();
  return NextResponse.json(
    state ?? { characters: null, updatedAt: null },
  );
}

interface PutBody {
  characters?: unknown;
}

export async function PUT(req: Request) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "서버 스토리지(Redis)가 설정되지 않았습니다." },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => null)) as PutBody | null;
  if (!body || !Array.isArray(body.characters)) {
    return NextResponse.json(
      { error: "characters 배열이 필요합니다." },
      { status: 400 },
    );
  }
  try {
    const state = await saveCharacters(body.characters as Character[]);
    return NextResponse.json(state);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
