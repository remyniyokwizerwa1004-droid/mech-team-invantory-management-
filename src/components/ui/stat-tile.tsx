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
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
  icon: LucideIcon;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-body">{label}</p>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg",
            ICON_CLASSES[tone],
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-ink">
        {value}
      </p>

      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );

  const shell =
    "rounded-card border border-line bg-surface p-4 shadow-card transition-colors";

  if (href) {
    return (
      <Link href={href} className={cn(shell, "block hover:border-brand-line")}>
        {content}
      </Link>
    );
  }

  return <div className={shell}>{content}</div>;
}
