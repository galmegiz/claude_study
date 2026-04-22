# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**WoW 길드원 관리 프로토타입** — Next.js 15 (App Router) + TypeScript + Tailwind + Zustand. Vercel 배포 대상.

이 리포는 **프로토타입**입니다. 실제 Blizzard API / 전투정보실 연동은 전부 더미로 대체돼 있습니다 — 시드 JSON(`data/characters.json`) + 결정론적 `dummyFetch()` (해시 기반) 조합. 실제 API 연동은 현재 범위 밖이며, 이전에 Kotlin CLI로 시도한 흔적이 `_kotlin_legacy/`에 보관되어 있습니다 (빌드 대상 아님).

## Commands

```bash
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버

npm run typecheck    # tsc --noEmit
npm run lint         # next lint (flat eslint config)
npm run test:smoke   # node --experimental-strip-types 기반 단위 smoke
npm run verify       # typecheck + lint + smoke + build 통합 (배포 전 게이트)
```

단일 테스트만 돌리려면 현재 러너(Node built-in)에서는 `scripts/smoke.mts` 내부에서 원하는 `run("...", ...)` 만 남기거나, vitest 도입 시 별도 설정 필요.

## Architecture

### 데이터 플로우

```
data/characters.json            ← 시드 (9명, 정적 import)
    │
    ▼
src/lib/store.ts (Zustand + persist:localStorage, skipHydration)
    │  hydrate on client mount (StoreHydrator)
    │  addCharacter / addMany / removeCharacter / refreshCharacter / refreshAll
    │    → 내부에서 dummyFetch() 호출
    │
    ├─▶ src/app/page.tsx           대시보드 (table/filter/sort/stats/export)
    └─▶ src/app/add/page.tsx       추가 (form / CSV 탭)
```

`dummyFetch(input)` 는 `(realm, name)` 해시 기반 결정론 생성기 — 동일 입력이면 동일 출력. 이름에 `"없는"` 포함 시 `status=ERROR`로 폴백. "재조회" 는 같은 입력에 같은 결과라 값이 그대로 보이는 것이 **정상**.

### 하이드레이션 규약

- Zustand persist에 `skipHydration: true` 를 설정해 클라이언트 마운트 전에는 localStorage를 읽지 않음.
- `src/components/StoreHydrator.tsx` 가 루트 레이아웃에서 `useEffect` 로 `persist.rehydrate()` 호출.
- 이 패턴을 깨지 말 것: `skipHydration` 을 빼거나 store를 서버 컴포넌트에서 직접 읽으면 SSR/클라이언트 값 불일치로 React hydration warning이 발생함.

### 파일별 역할

| 경로 | 역할 |
|------|------|
| `src/app/layout.tsx`       | 루트 레이아웃 + 상단 네비 + `<StoreHydrator />` |
| `src/app/page.tsx`         | 대시보드: 검색/서버필터/정렬/14일+휴면필터, 통계 4카드, 전체재조회, CSV·JSON 내보내기, 시드 리셋/전체 삭제 |
| `src/app/add/page.tsx`     | 추가 페이지 (탭: 수기 / CSV), 토스트 피드백 |
| `src/components/CharacterTable.tsx` | 테이블 행 + 휴면 정도에 따른 색상 톤 + 삭제/재조회 액션 |
| `src/components/FilterBar.tsx`      | 검색창 + 서버 드롭다운 + 정렬 필드/방향 + 휴면 필터 체크박스 |
| `src/components/AddForm.tsx`        | 수기 입력 폼 (realm datalist / 직업 dropdown / 메모) |
| `src/components/CsvUpload.tsx`      | CSV 붙여넣기 + 파일 업로드 + 샘플 채우기 + 프리뷰 테이블 |
| `src/components/Stat.tsx`           | 통계 카드 (tone 속성으로 good/warn/bad 색) |
| `src/components/StoreHydrator.tsx`  | 위 하이드레이션 규약 구현 (건드리지 말 것) |
| `src/lib/types.ts`         | `Character`, `CharacterInput`, `CharacterClass` 등 — **모든** 도메인 타입의 단일 출처 |
| `src/lib/store.ts`         | Zustand store (persist, partialize=characters만) |
| `src/lib/csv.ts`           | quoted-cell 지원 CSV 파서, `toCsv`, `downloadBlob` (브라우저 전용) |
| `src/lib/dummyFetch.ts`    | 결정론적 해시 → level/iLvl/lastLogin 생성 + "없는" 실패 시뮬레이트 |
| `src/lib/format.ts`        | `formatKst` (Asia/Seoul), `daysSince`, `cx` (class 조합) |
| `data/characters.json`     | 시드 9명 (정상 8 + ERROR 1) |
| `scripts/smoke.mts`        | 순수 로직 유닛 smoke (Node 25 `--experimental-strip-types`) |

## 규약

- **신규 도메인 타입은 반드시 `src/lib/types.ts` 에 먼저 정의**한 뒤 다른 모듈에서 import. 한국어 리터럴 유니온(`CharacterClass` 등)을 쓰는 전제. 타입 중복 정의 금지.
- **브라우저 전용 API** (`window`, `document`, `localStorage`) 는 client component 또는 이벤트 핸들러 내에서만 접근. `"use client"` 없는 파일에서 쓰면 빌드는 통과해도 prerender 단계에서 터짐.
- **Tailwind 색상**: 브랜드 보라색은 `bg-brand-500 / 600 / 700` (tailwind.config.ts 정의). 배경/표면/텍스트는 CSS 변수 (`--background`, `--surface`, `--surface-muted`, `--border`, `--text`, `--text-muted`) — 다크모드 전제, 라이트모드는 없음.
- **더미 시뮬레이션 문법**: 캐릭터 이름 안에 `"없는"` 포함 시 fetch 실패로 시뮬레이트. 에러 플로우 테스트에 사용할 때 이 규약을 유지.
- **Vercel 배포**: 별도 `vercel.json` 없음. 레포 루트를 그대로 Vercel에 연결하면 자동으로 Next.js 프로젝트로 인식됨. 환경변수 필요 없음 (프로토타입은 전부 더미이므로).
- **legacy 디렉토리**: `_kotlin_legacy/` 는 `.gitignore`, `tsconfig.json` (exclude), `eslint.config.mjs` (ignores) 에 전부 등록돼 있음. 여기에 새 코드를 추가하지 말 것 — 리포 정리 시 일괄 삭제 가능해야 함.

## 확장 시 주의

- **실제 API 연동 추가**: 클라이언트에서 Blizzard OAuth 비밀 키를 노출하면 안 됨. Route Handler (`src/app/api/...`) 를 경유해 서버에서만 토큰을 다루는 구조로 가야 함.
- **스크래핑 도입**: 전투정보실은 SPA라 서버 환경 없이는 `__NEXT_DATA__` 또는 초기 HTML에 의존해야 함 — 구조 변경에 매우 취약하므로 반드시 API가 우선이고 스크래퍼는 폴백 전용.
- **새 페이지**: App Router 라우트 세그먼트 기준. 상태는 Zustand 스토어로 집중, page 단위로 분기된 상태는 피할 것.

## 기존 자산

- `docs/plan.md` — 이 프로젝트의 초기 Kotlin CLI 방향 기획서. 현재 스택과 맞지 않으므로 참고용으로만 보되, 더미 로직/필드 이름(`realm slug`, `equipped_item_level` 등)은 이 기획서에서 유래함.
- `_kotlin_legacy/` — Kotlin CLI 코드 (Config, Models, BlizzardClient, ArmoryScraper 등). 삭제해도 현재 웹 프로토타입 동작엔 영향 없음.
