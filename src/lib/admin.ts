// 프로토타입용 관리자 비밀번호. 운영 시에는
// (1) 서버 측 검증 (/api/admin-auth) 또는
// (2) NEXT_PUBLIC_ADMIN_PASSWORD 환경변수 + 서버 라우트 게이트
// 로 옮길 것. 현재는 클라이언트 상수로 보관됨.
export const ADMIN_PASSWORD = "admin1234";
