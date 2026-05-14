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
