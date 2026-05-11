"use client";

import { useGuildStore } from "@/lib/store";
import { ADMIN_PASSWORD } from "@/lib/admin";

export function AdminToggle() {
  const adminMode = useGuildStore((s) => s.adminMode);
  const setAdminMode = useGuildStore((s) => s.setAdminMode);

  const onClick = () => {
    if (adminMode) {
      setAdminMode(false);
      return;
    }
    const pw = window.prompt("관리자 비밀번호를 입력하세요");
    if (pw === null) return;
    if (pw === ADMIN_PASSWORD) {
      setAdminMode(true);
    } else {
      window.alert("비밀번호가 일치하지 않습니다.");
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        adminMode
          ? "rounded-md border border-amber-400/40 bg-amber-400/15 px-2 py-1 text-xs font-medium text-amber-300 hover:bg-amber-400/25"
          : "rounded-md border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--surface)]"
      }
      title={
        adminMode
          ? "관리자 모드 ON · 클릭하면 OFF"
          : "관리자 모드 OFF · 클릭하면 비밀번호 입력"
      }
    >
      {adminMode ? "관리자 모드 ON" : "관리자 모드"}
    </button>
  );
}
