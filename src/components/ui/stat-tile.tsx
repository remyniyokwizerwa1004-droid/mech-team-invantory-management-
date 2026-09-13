import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import type { Tone } from "@/lib/display";
import { cn } from "@/lib/utils";

const ICON_CLASSES: Record<Tone, string> = {
  positive: "bg-positive-soft text-positive",
  warning: "bg-warning-soft text-warning",
  critical: "bg-critical-soft text-critical",
  neutral: "bg-neutral-soft text-neutral",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
};

/** Lighter tints of the same tones, readable on the dark photo banner. */
const GLASS_ICON_CLASSES: Record<Tone, string> = {
  positive: "bg-emerald-400/15 text-emerald-300",
  warning: "bg-amber-400/15 text-amber-300",
  critical: "bg-rose-400/15 text-rose-300",
  neutral: "bg-white/10 text-slate-200",
  info: "bg-sky-400/15 text-sky-300",
  accent: "bg-violet-400/15 text-violet-300",
};

/**
 * A headline number. The icon and the label carry the meaning; the colour only
 * reinforces it, so this still reads correctly in greyscale or for a
 * colourblind reader.
 *
 * The value uses the font's proportional figures on purpose. Tabular figures
 * give every digit the width of a zero, which looks loose at this size.
 */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
  href,
  variant = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
  icon: LucideIcon;
  href?: string;
  /** "glass" sits on the dark photo banner; "default" on the page. */
  variant?: "default" | "glass";
}) {
  const glass = variant === "glass";

  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            glass
              ? "text-xs font-semibold tracking-wide text-white/75 uppercase"
              : "text-sm font-medium text-body",
          )}
        >
          {label}
        </p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            glass ? GLASS_ICON_CLASSES[tone] : ICON_CLASSES[tone],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      <p
        className={cn(
          "mt-3 text-3xl font-semibold tracking-tight",
          glass ? "text-white" : "text-ink",
        )}
      >
        {value}
      </p>

      {hint ? (
        <p className={cn("mt-1 text-xs", glass ? "text-white/65" : "text-muted")}>
          {hint}
        </p>
      ) : null}
    </>
  );

  const shell = glass
    ? "rounded-card border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm transition-colors"
    : "rounded-card border border-line bg-surface p-4 shadow-card transition-colors";

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          shell,
          "block",
          glass ? "hover:border-white/35 hover:bg-white/[0.12]" : "hover:border-brand-line",
        )}
      >
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}
