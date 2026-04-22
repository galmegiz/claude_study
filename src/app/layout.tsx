import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { StoreHydrator } from "@/components/StoreHydrator";

export const metadata: Metadata = {
  title: "길드원 관리 (프로토타입)",
  description: "WoW 길드원 레벨·템렙·최종접속 조회 프로토타입",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <StoreHydrator />
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-7 w-7 rounded-md bg-brand-500" />
              <span className="text-lg font-semibold tracking-tight">
                길드원 관리
              </span>
              <span className="ml-2 rounded bg-[var(--surface-muted)] px-2 py-0.5 text-xs text-[var(--text-muted)]">
                prototype
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">대시보드</NavLink>
              <NavLink href="/add">캐릭터 추가</NavLink>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-6 pb-10 pt-4 text-center text-xs text-[var(--text-muted)]">
          더미 데이터로 동작하는 프로토타입입니다. 실제 Blizzard API/전투정보실 연동은 추후 작업.
        </footer>
      </body>
    </html>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
    >
      {children}
    </Link>
  );
}
