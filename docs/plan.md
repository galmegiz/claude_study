# WoW 길드원 관리 CLI (Kotlin + Blizzard API)

## Context

현재 `/Users/sun/study/claude_study/`는 README 한 줄만 있는 빈 git 리포지토리. 길드원 캐릭터를 수기 입력하면 **레벨 / 템렙 / 최종접속일**을 조회해 표와 파일로 저장하는 도구를 Kotlin + CLI로 1단계 구현하려 함. 추후 웹/DB 확장을 염두에 두고 얇고 확장 가능한 구조로 시작.

**결정 사항 (사용자 확인 완료)**
- 언어: Kotlin (Gradle Kotlin DSL)
- 데이터 소스 (1차): Blizzard Battle.net API (region=kr, namespace=profile-kr)
- 데이터 소스 (폴백): 월드오브워크래프트 전투정보실 페이지 스크래핑
- 인터페이스: CLI + CSV/JSON 출력

---

## 아키텍처 개요

각 캐릭터에 대해 **API → 스크래퍼** 순으로 조회하는 체인 구조(`CharacterSource` 인터페이스). API가 성공하면 스크래퍼는 호출하지 않음. 실패 정책:

- API가 4xx/5xx 또는 필드 누락(프로필 공개 설정 OFF 등)으로 실패 → Armory 스크래퍼로 폴백
- 두 소스 모두 실패 → 결과 행의 `status`에 실패 사유 기록하고 계속 진행
- 각 행의 최종 `source` 컬럼에 `api` 또는 `armory` 기록 (추적용)

### 1차: Blizzard API
- OAuth2: `POST https://oauth.battle.net/token` (Basic auth = clientId:clientSecret, body `grant_type=client_credentials`). 응답 `access_token` 재사용, `expires_in` 만큼 캐시.
- Profile: `GET https://kr.api.blizzard.com/profile/wow/character/{realmSlug}/{characterName}?namespace=profile-kr&locale=ko_KR`
  - `level` → 레벨
  - `equipped_item_level` → 착용 템렙
  - `average_item_level` → 평균 템렙 (참고)
  - `last_login_timestamp` (ms epoch) → 최종 접속일
- 자격증명: `.env` 또는 env `BLIZZARD_CLIENT_ID` / `BLIZZARD_CLIENT_SECRET` (Battle.net 개발자 포털 https://develop.battle.net/ 에서 발급).

### 2차: 전투정보실(Armory) 스크래퍼
- URL: `https://worldofwarcraft.blizzard.com/ko-kr/character/kr/{realmSlug}/{characterName}`
- 전투정보실은 SPA지만 초기 HTML에 `<script id="__NEXT_DATA__">{...}</script>` 또는 메타 태그로 주요 수치가 임베드됨. 먼저 **Jsoup + embedded JSON 파싱**을 시도하고, 이 경로에서 필요한 3개 필드를 모두 확보할 수 있으면 그대로 사용.
- 구현 절차:
  1. Ktor client로 HTML GET (브라우저 User-Agent 지정).
  2. Jsoup으로 파싱 → `__NEXT_DATA__` script 추출 → kotlinx.serialization으로 필요한 경로(`props.pageProps.character.level / itemLevelEquipped / lastLoginTimestamp` 등, 실제 키는 구현 시점에 HTML 샘플로 확정)까지 네비게이트.
  3. JSON 경로에서 못 찾으면 DOM selector 폴백(예: `.CharacterHeader-level`, `.ItemLevel-value`) — 클래스명은 구현 시점에 최신 DOM으로 확정.
- 전투정보실은 "최종접속일"을 직접 노출하지 않을 수 있음 → 이 경우 해당 필드만 `status=LAST_LOGIN_UNAVAILABLE (armory)` 로 비워두고 나머지(레벨/템렙)는 채움. (API 경로에서는 정상 수집됨.)
- 스크래퍼는 폴리시상 취약 (DOM 변경에 깨짐) — 그래서 **폴백 한정**이며, 셀렉터/JSON 경로는 한 파일(`ArmoryScraper.kt`)로 격리해 유지보수.
- JS 렌더링 없이 데이터 추출이 안 되는 것으로 판명되면 Playwright-Kotlin 도입 여부를 그 시점에 사용자에게 재확인.

---

## 프로젝트 구조

```
claude_study/
├── build.gradle.kts
├── settings.gradle.kts
├── gradle.properties
├── gradle/wrapper/…           (gradle wrapper 생성)
├── .gitignore                 (.env, build/, .gradle/)
├── .env.example               (BLIZZARD_CLIENT_ID=…)
├── characters.csv             (사용자 입력, 예시 포함)
└── src/main/kotlin/com/study/wowguild/
    ├── Main.kt                (Clikt CLI 엔트리 + 소스 체인 orchestration)
    ├── Config.kt              (env/.env 로딩 + region 상수)
    ├── CharacterSource.kt     (인터페이스: suspend fun fetch(realm,name): Result<CharacterReport>)
    ├── BlizzardClient.kt      (CharacterSource 구현: OAuth 토큰 + profile 조회 + 재시도)
    ├── ArmoryScraper.kt       (CharacterSource 구현: 전투정보실 HTML 파싱 폴백)
    ├── Models.kt              (CharacterInput / CharacterReport + @Serializable DTO)
    ├── CharactersIO.kt        (CSV 읽기, CSV+JSON 쓰기, 콘솔 표 포맷)
    └── TimeUtil.kt            (epoch ms → "yyyy-MM-dd HH:mm" KST)
```

---

## 의존성 (build.gradle.kts)

- `org.jetbrains.kotlin.jvm` 2.0.x
- `org.jetbrains.kotlin.plugin.serialization`
- `io.ktor:ktor-client-core`, `ktor-client-cio`, `ktor-client-content-negotiation`, `ktor-serialization-kotlinx-json` (v2.3.x)
- `org.jetbrains.kotlinx:kotlinx-serialization-json`
- `com.github.ajalt.clikt:clikt` 4.x (CLI 파싱)
- `io.github.cdimascio:dotenv-kotlin` (.env 로딩, 선택)
- `org.jetbrains.kotlinx:kotlinx-datetime` (KST 변환)
- `org.jsoup:jsoup` 1.17.x (Armory HTML 파싱 폴백)
- `application` 플러그인 + `mainClass = "com.study.wowguild.MainKt"` → `./gradlew run --args="…"` 실행

---

## 입력 / 출력 포맷

### 입력: `characters.csv`
```csv
realm,name
azshara,차넬
hyjal,홀리차넬
```
- `realm`은 realm **slug** (영문 소문자). 주요 KR 서버 slug 주석으로 문서화:
  `azshara, hyjal, durotan, windrunner, burning-legion, cenarius, dalaran, deathwing, garona, hellscream, malfurion, rexxar, wildhammer, zulJin` 등.
- 헤더 행 필수. 공백/빈 줄 허용.

### CLI
- `./gradlew run --args="--input characters.csv --output-dir out"`
- 옵션: `--input <csv>` (기본 `characters.csv`), `--output-dir <dir>` (기본 `./out`), `--concurrency <n>` (기본 4).

### 출력
1. **콘솔 표** (고정폭 ASCII 표)
   ```
   Realm      Name        Level  iLvl   Last Login
   ───────────────────────────────────────────────────────
   azshara    차넬          80    642    2026-04-20 23:14 KST
   hyjal      홀리차넬       70    580    2026-03-02 09:02 KST
   ```
2. **`out/report.csv`**: `realm,name,level,equipped_item_level,average_item_level,last_login_kst,source,status`
   - `source` = `api` 또는 `armory` (어느 소스에서 채워졌는지)
3. **`out/report.json`**: 동일 데이터 JSON 배열 + `generated_at` 메타.
4. 실패 행은 `status`에 `NOT_FOUND / HTTP_4xx / ERROR:<msg>` 기록하고 계속 진행.

---

## 실행 흐름 (Main.kt)

1. Clikt로 인자 파싱 → `Config.load()`. Blizzard credential이 없으면 경고 로그 후 API 스킵, 스크래퍼만 사용 모드로 동작.
2. `sources = listOf(BlizzardClient(...), ArmoryScraper(...))` (credential 없으면 API 제외).
3. `CharactersIO.readCsv(input)` → `List<CharacterInput>`.
4. `coroutineScope { List<Deferred<Report>> }` 로 동시 호출 (`Semaphore(concurrency)` 로 제한). 각 행 처리:
   - `sources`를 순서대로 시도 → 첫 성공에서 결과 확정, `source` 필드 기록.
   - 4xx/5xx/파싱 실패 → 다음 source 시도.
   - 429 → `Retry-After` 만큼 대기 후 같은 source 1회 재시도.
5. 모든 source 실패 시 status에 마지막 에러 요약 기록.
6. `CharactersIO.writeCsv + writeJson + printTable`.

### BlizzardClient 핵심 메서드
- `suspend fun getCharacter(realm: String, name: String): CharacterDto`
  - URL 인코딩: `name`은 소문자 + UTF-8 퍼센트 인코딩 (`URLEncoder.encode(name.lowercase(), UTF_8)`). Blizzard API는 이름을 소문자로 요구.

### ArmoryScraper 핵심 메서드
- `suspend fun getCharacter(realm: String, name: String): CharacterDto`
  - 요청 시 `User-Agent: Mozilla/5.0 …` 지정 (기본 Ktor UA면 차단 가능성).
  - 한글 캐릭터명은 URL 퍼센트 인코딩 (예: `차넬` → `%EC%B0%A8%EB%84%AC`).
  - HTML 응답에서 `__NEXT_DATA__`(또는 유사한 초기 state) JSON을 추출 → 필드 매핑.
  - 못 찾으면 DOM selector 폴백 → 그래도 못 찾으면 `ParseException` throw → 다음 소스 시도.

---

## 검증 (end-to-end)

1. `cp .env.example .env` 후 본인 Battle.net client id/secret 입력.
2. `characters.csv`에 본인이 아는 실제 캐릭터 2–3개 기입 (예: 본캐 + 부캐).
3. `./gradlew run --args="--input characters.csv"` 실행.
4. 확인 포인트:
   - 콘솔 표에 레벨/템렙/최종접속일이 채워져 있고 `source=api` 로 표시되는가.
   - `out/report.csv`, `out/report.json` 파일이 생성되었고 데이터가 일치하는가.
   - 존재하지 않는 캐릭터명을 일부러 한 줄 추가 → API가 404 → 스크래퍼도 실패 → `status=NOT_FOUND` 로 기록되고 프로세스는 정상 종료되는가.
   - **폴백 경로 검증**: 환경변수에서 `BLIZZARD_CLIENT_SECRET`를 일부러 잘못된 값으로 바꿔 실행 → API는 모두 실패하지만 Armory 스크래퍼가 레벨/템렙을 채워 `source=armory`로 표시되는가.
   - `BLIZZARD_CLIENT_ID`를 비우면 "API 건너뜀, 스크래퍼만 사용" 경고 로그 후에도 동작하는가.
5. (선택) `./gradlew build` 로 컴파일/단위 테스트(`CharactersIOTest`: CSV 파싱, TimeUtil 변환) 통과 확인.

---

## 구현 단계 (체크리스트)

1. Gradle wrapper 초기화 + `build.gradle.kts` / `settings.gradle.kts` 작성.
2. `.gitignore`, `.env.example`, `characters.csv` 예시 작성.
3. `Config.kt`, `Models.kt`, `TimeUtil.kt`, `CharacterSource.kt` 작성.
4. `BlizzardClient.kt` (토큰 + 프로필 + 재시도, `CharacterSource` 구현).
5. `ArmoryScraper.kt` (Ktor + Jsoup, 실제 전투정보실 페이지 1건을 로컬 테스트로 확인하며 JSON 경로 확정).
6. `CharactersIO.kt` (CSV 읽기/쓰기, JSON 쓰기, 콘솔 표 — `source` 컬럼 포함).
7. `Main.kt` (Clikt + 병렬 호출 + 소스 체인 폴백).
8. 단위 테스트 (`src/test/kotlin/…`) — CSV 파싱, TimeUtil, ArmoryScraper(저장된 HTML 샘플 fixture로) 커버.
9. README 업데이트 (현재 1줄짜리) — 설치/실행/환경변수/폴백 동작 문서화.

---

## 확장 포인트 (이번 범위 밖, 다음 단계 참고용)

- SQLite 저장 → 과거 조회 기록과 비교 (접속 공백 감지).
- Raid Progress / M+ 등급 → Raider.IO 병합.
- Flask/Ktor 서버 + 간단한 웹 뷰.
- Battle.net OAuth user-auth 로 길드원 목록 자동 fetch (Guild Roster API).
