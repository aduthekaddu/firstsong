import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "on-prussian";

const variantStyles: Record<Variant, string> = {
  primary:
    "border border-[var(--prussian)] bg-[var(--prussian)] text-[var(--prussian-ink)] hover:border-[var(--cobalt)] hover:bg-[var(--cobalt)]",
  secondary:
    "border border-[var(--rule-mid)] bg-[var(--folio)] text-[var(--ink)] hover:border-[var(--prussian)] hover:bg-[var(--prussian)] hover:text-[var(--prussian-ink)]",
  accent:
    "border border-[var(--cinnabar)] bg-[var(--cinnabar)] text-[var(--folio)] hover:border-[var(--prussian)] hover:bg-[var(--prussian)]",
  ghost:
    "border border-transparent bg-transparent text-[var(--ink-muted)] hover:border-[var(--rule-mid)] hover:text-[var(--ink)]",
  "on-prussian":
    "border border-[var(--prussian-ink)]/35 bg-[var(--folio)] text-[var(--prussian)] hover:border-[var(--bronze)] hover:bg-[var(--bronze)] hover:text-[var(--prussian-deep)]",
};

export function UrtextButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  const sizeClass =
    size === "sm"
      ? "min-h-9 px-3.5 py-1.5 text-xs"
      : size === "lg"
        ? "min-h-12 px-7 py-3.5 text-sm"
        : "min-h-11 px-5 py-2.5 text-sm";

  return (
    <button
      type="button"
      className={`tactile inline-flex cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium tracking-[0.01em] disabled:cursor-not-allowed disabled:opacity-40 ${sizeClass} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PlateEyebrow({
  index,
  label,
  tone = "cobalt",
}: {
  index?: string;
  label: string;
  tone?: "cobalt" | "cinnabar" | "prussian" | "light";
}) {
  const color =
    tone === "cinnabar"
      ? "text-[var(--cinnabar)]"
      : tone === "light"
        ? "text-[var(--bronze)]"
        : tone === "prussian"
          ? "text-[var(--ink-muted)]"
          : "text-[var(--cobalt)]";

  return (
    <p className={`font-mono-score inline-flex items-center gap-2.5 text-[11px] font-medium uppercase ${color}`}>
      {index && (
        <span className="inline-block border-r border-current/30 pr-2.5 opacity-85">{index}</span>
      )}
      <span>{label}</span>
    </p>
  );
}
