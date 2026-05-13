import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { StoreHydrator } from "@/components/StoreHydrator";
import { AdminToggle } from "@/components/AdminToggle";
import { EnrichmentBanner } from "@/components/EnrichmentBanner";

export const metadata: Metadata = {
  title: "길드원 관리",
  description: "WoW 길드원 레벨·템렙·최종접속 조회",
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
        <EnrichmentBanner />
        <header className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              <span className="inline-block h-7 w-7 rounded-md bg-brand-500" />
              <span className="text-lg font-semibold tracking-tight">
                길드원 관리
              </span>
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <NavLink href="/">대시보드</NavLink>
              <span className="mx-2 h-5 w-px bg-[var(--border)]" />
              <AdminToggle />
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
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
