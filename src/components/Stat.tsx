import { cx } from "@/lib/format";

export function Stat({
  label,
  value,
  tone = "default",
  onClick,
  active = false,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn" | "bad";
  onClick?: () => void;
  active?: boolean;
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "bad"
          ? "text-rose-400"
          : "text-[var(--text)]";

  const baseClass = cx(
    "block w-full rounded-lg border bg-[var(--surface)] px-4 py-3 text-left transition-colors",
    active
      ? "border-brand-500 ring-1 ring-brand-500"
      : "border-[var(--border)]",
    onClick && "cursor-pointer hover:bg-[var(--surface-muted)]",
  );

  const content = (
    <>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={baseClass}
      >
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}
