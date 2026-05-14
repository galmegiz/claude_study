const REALM_KO: Record<string, string> = {
  azshara: "아즈샤라",
  hyjal: "하이잘",
  durotan: "듀로탄",
  windrunner: "윈드러너",
  "burning-legion": "불타는 군단",
  cenarius: "세나리우스",
  dalaran: "달라란",
  deathwing: "데스윙",
  garona: "가로나",
  hellscream: "헬스크림",
  malfurion: "말퓨리온",
  rexxar: "렉사르",
  wildhammer: "와일드해머",
  alexstrasza: "알렉스트라자",
  norgannon: "노르간논",
  stormrage: "스톰레이지",
};

export function formatRealm(slug: string): string {
  if (!slug) return slug;
  return REALM_KO[slug.toLowerCase()] ?? slug;
}

const KO_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(REALM_KO).map(([slug, ko]) => [ko, slug]),
);

// 페이로드/사용자 입력의 realm 표기를 store가 쓰는 영문 슬러그로 정규화.
// 한글명("아즈샤라"), 영문명("Azshara"), 슬러그("burning-legion"), 공백 포함 영문
// ("Burning Legion") 모두 동일한 슬러그로 수렴.
// 매핑에 없는 한글명은 한글이 그대로 남는데, 이 경우 매칭은 실패하고 endpoint가
// unmatched로 보고함 → 매핑 보강 필요 신호로 사용.
export function toRealmSlug(input: string): string {
  if (!input) return "";
  const trimmed = input.trim();
  const direct = KO_TO_SLUG[trimmed];
  if (direct) return direct;
  return trimmed
    .toLowerCase()
    .replace(/[\s']+/g, "-")
    .replace(/[^a-z0-9가-힣\-]+/g, "");
}
