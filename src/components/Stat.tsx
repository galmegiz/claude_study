import { cx } from "@/lib/format";

export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-400"
      : tone === "warn"
        ? "text-amber-400"
        : tone === "bad"
          ? "text-rose-400"
          : "text-[var(--text)]";

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className={cx("mt-1 text-2xl font-semibold tracking-tight", toneClass)}>
        {value}
      </div>
    </div>
  );
}
