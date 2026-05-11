# 길드원 관리 (WoW) — 프로토타입

Next.js 15 + TypeScript + Tailwind 로 동작하는 WoW 길드원 대시보드 **프로토타입**입니다. 현재 모든 플로우는 정적 시드 JSON(`data/characters.json`)과 결정론적 더미 fetch로 돌아갑니다. 실제 Blizzard API / 전투정보실 연동은 이후 작업으로 분리되어 있고, 관련 Kotlin 시도는 `_kotlin_legacy/` 에 보관돼 있습니다.

## 기능

- **대시보드 (`/`)**: 길드원 테이블, 검색/서버 필터/정렬, 14일+ 미접속 필터, 총원/평균 템렙/휴면/실패 통계 카드, 전체 재조회, CSV·JSON 내보내기, 시드 리셋, 전체 삭제.
- **캐릭터 추가 (`/add`)**: 세 가지 탭.
  - 수기 입력 폼 (서버 자동완성 + 직업 선택 + 메모)
  - CSV 업로드 (한글 `서버명,계정명` 헤더 또는 영문 `realm,name` 둘 다 지원, 파일/붙여넣기/샘플, 파싱 오류 라인별 표시, 일괄 추가)
  - **길드 페이지에서 가져오기** — 전투정보실 URL 또는 (서버, 길드 slug) 입력 → `/api/guild-roster` 호출 → 미리보기 + 이름 필터 + 전체 추가. 환경변수에 Blizzard 자격증명 있으면 실제 API, 없으면 더미.
- **상태 유지**: Zustand + `localStorage` (`wow-guild-store:v1`). SSR 하이드레이션 mismatch를 막기 위해 `skipHydration: true` + `StoreHydrator`로 클라이언트 마운트 후 재수화.

## 요구 사항

- Node.js 20 이상 (현재 개발 환경은 Node 25 + npm 11)
- (선택) Blizzard API 자격증명 — `.env.local` 에 `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` 설정 시 길드 로스터 조회가 실제 API 사용. 없으면 더미 폴백.

## 개발 / 실행

```bash
npm install          # 의존성 설치
npm run dev          # http://localhost:3000
npm run build        # 프로덕션 빌드
npm run start        # 프로덕션 서버
```

## 자체 테스트

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # next lint (eslint flat config)
npm run test:smoke   # pure 로직 단위 테스트 (csv/dummyFetch/format)
npm run verify       # 위 3가지 + next build 통합
```

`npm run verify` 가 성공하면 타입/린트/로직/빌드가 전부 통과한 상태입니다.

## Vercel 배포

1. 이 리포를 GitHub에 푸시.
2. Vercel 대시보드 → **New Project** → 이 리포 선택.
3. **Framework Preset** 드롭다운에서 **Next.js** 가 선택돼 있는지 확인 (자동 감지 실패 시 "Other"로 잡힘 → 수동 변경).
4. **Environment Variables** 섹션에서 `.env.example` 의 키를 등록:
   - `BLIZZARD_CLIENT_ID`
   - `BLIZZARD_CLIENT_SECRET`
   - `BLIZZARD_REGION` (선택, 기본 `kr`)
   비워두면 길드 로스터가 더미 모드로 동작합니다 (다른 기능엔 영향 없음).
5. Build Command / Output Directory 는 기본값 사용. `_kotlin_legacy/` 는 빌드에서 자동 제외.

## 더미 동작 규칙

- 캐릭터 이름에 **"없는"**이 포함되면 조회 실패(`status=ERROR`)로 시뮬레이트됩니다.
- 그 외 이름은 `(realm, name)` 해시 기반으로 **결정론적**으로 레벨(60~80) / 평균템렙 / 착용템렙 / 최근 0~45일 내 최종접속이 생성됩니다 — 같은 키는 항상 같은 값.
- "재조회"는 같은 입력이면 같은 값이 나오므로, 값 변화가 없어 보이는 건 정상.

## 디렉토리 구조 (요지)

```
├── src/
│   ├── app/
│   │   ├── layout.tsx     루트 레이아웃 + StoreHydrator
│   │   ├── page.tsx       대시보드
│   │   └── add/page.tsx   추가 (폼 / CSV 탭)
│   ├── components/        테이블, 필터바, 폼, CSV 업로더, Stat 카드
│   └── lib/
│       ├── types.ts       Character, CharacterInput 등 타입
│       ├── store.ts       Zustand + persist
│       ├── csv.ts         CSV 파서/직렬화/다운로드
│       ├── dummyFetch.ts  결정론적 더미 fetch
│       └── format.ts      KST 포맷/경과일/cx
├── data/characters.json   초기 시드 9명
├── scripts/smoke.mts      로직 단위 테스트
├── docs/plan.md           (이전 Kotlin CLI 시기의 기획 문서, 참고용)
└── _kotlin_legacy/        Kotlin CLI 시도분 (빌드 대상 아님)
```

## 다음 단계 (이번 범위 밖)

- Next.js API Route로 Blizzard API 프록시 구현 (OAuth client credentials 서버 보관, 토큰 캐시).
- 전투정보실 스크래퍼를 서버 사이드 Route Handler로 포팅 (Jsoup → `node-html-parser`).
- 캐릭터 상세 페이지 (`/c/[realm]/[name]`) + 장비/스탯 더미.
- 과거 기록 비교 (상태 변화 감지), Raider.IO M+/등급 머지.
