#!/usr/bin/env node
/**
 * Vercel 배포 시 Blizzard API 통합 검증 게이트.
 *
 * 정책 (배포 전용):
 *  - 로컬 (VERCEL!=1)       → 무조건 통과. 로컬 빌드 속도/네트워크에 영향 X.
 *  - Vercel (VERCEL=1)      → 항상 동작. 자격증명 누락 또는 API 호출 실패 시 배포 중단.
 *  - SKIP_BLIZZARD_CHECK=1  → 긴급 우회 (Vercel 환경변수로 추가하면 게이트 무력화).
 *
 * 검증 내용:
 *  1) OAuth client_credentials 토큰 발급
 *  2) 길드 로스터 한 건 조회 (기본 azshara/nnde, env 로 변경 가능)
 *
 * 환경변수 (Vercel Project Settings > Environment Variables):
 *  BLIZZARD_CLIENT_ID, BLIZZARD_CLIENT_SECRET — 필수
 *  BLIZZARD_REGION                            — 기본 kr
 *  BLIZZARD_CHECK_REALM, BLIZZARD_CHECK_GUILD — 검증용 길드 (기본 azshara/nnde)
 *  SKIP_BLIZZARD_CHECK=1                      — 긴급 우회
 */

const TAG = "[blizzard-check]";

function info(msg) {
  console.log(`${TAG} ${msg}`);
}
function fail(msg, hint) {
  console.error(`${TAG} FAIL · ${msg}`);
  if (hint) console.error(`${TAG} hint · ${hint}`);
  process.exit(1);
}

const SKIP = process.env.SKIP_BLIZZARD_CHECK === "1";
const IS_VERCEL = process.env.VERCEL === "1";
const id = process.env.BLIZZARD_CLIENT_ID;
const secret = process.env.BLIZZARD_CLIENT_SECRET;
const region = (process.env.BLIZZARD_REGION || "kr").toLowerCase();
const checkRealm = (process.env.BLIZZARD_CHECK_REALM || "azshara").toLowerCase();
const checkGuild = (process.env.BLIZZARD_CHECK_GUILD || "nnde").toLowerCase();

if (SKIP) {
  info("SKIP_BLIZZARD_CHECK=1 → 검증 우회");
  process.exit(0);
}

if (!IS_VERCEL) {
  info("로컬 환경 (VERCEL!=1) → 배포 게이트만 동작. 통과.");
  process.exit(0);
}

if (!id || !secret) {
  fail(
    "Vercel 배포 환경인데 BLIZZARD_CLIENT_ID/SECRET 가 비어 있음",
    "Vercel Project Settings > Environment Variables 에서 키를 추가하고 재배포하세요.",
  );
}

async function check() {
  // 1) OAuth
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const tokenResp = await fetch("https://oauth.battle.net/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenResp.ok) {
    const body = await tokenResp.text().catch(() => "");
    fail(
      `OAuth 토큰 발급 실패 (HTTP ${tokenResp.status}) — ${body.slice(0, 200)}`,
      "BLIZZARD_CLIENT_ID/SECRET 값이 정확한지, https://develop.battle.net/ 에서 발급 받은 client 가 활성 상태인지 확인.",
    );
  }
  const tokenData = await tokenResp.json();
  const token = tokenData.access_token;
  if (!token) fail("OAuth 응답에 access_token 없음");

  info(`OAuth OK · scope=${tokenData.scope || "-"} · expires_in=${tokenData.expires_in}s`);

  // 2) Guild roster
  const url =
    `https://${region}.api.blizzard.com/data/wow/guild/` +
    `${encodeURIComponent(checkRealm)}/${encodeURIComponent(checkGuild)}/roster` +
    `?namespace=profile-${region}&locale=ko_KR`;

  const rosterResp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!rosterResp.ok) {
    fail(
      `길드 로스터 조회 실패 (HTTP ${rosterResp.status}) · ${checkRealm}/${checkGuild}`,
      "BLIZZARD_REGION 또는 BLIZZARD_CHECK_REALM/GUILD 값이 잘못됐을 수 있음. 또는 클라이언트 권한 부족.",
    );
  }
  const roster = await rosterResp.json();
  const memberCount = Array.isArray(roster.members) ? roster.members.length : 0;
  if (memberCount === 0) {
    fail(
      `길드 로스터가 비어있음 · ${checkRealm}/${checkGuild}`,
      "다른 길드로 BLIZZARD_CHECK_REALM/GUILD 를 바꿔서 다시 시도.",
    );
  }
  info(
    `Roster OK · ${roster.guild?.name ?? checkGuild} (realm=${roster.guild?.realm?.name ?? "-"}, members=${memberCount})`,
  );
  info("Blizzard API 검증 통과");
}

check().catch((e) => {
  fail(`예외 발생: ${e?.message ?? e}`);
});
