import type { ReactNode } from "react";

import type { Tone } from "@/lib/display";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<Tone, string> = {
  positive: "border-positive-line bg-positive-soft text-positive",
  warning: "border-warning-line bg-warning-soft text-warning",
  critical: "border-critical-line bg-critical-soft text-critical",
  neutral: "border-neutral-line bg-neutral-soft text-neutral",
  info: "border-info-line bg-info-soft text-info",
  accent: "border-accent-line bg-accent-soft text-accent",
};

const DOT_CLASSES: Record<Tone, string> = {
  positive: "bg-positive",
  warning: "bg-warning",
  critical: "bg-critical",
  neutral: "bg-neutral",
  info: "bg-info",
  accent: "bg-accent",
};

export function Badge({
  tone = "neutral",
  dot = false,
  children,
  className,
}: {
  tone?: Tone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 rounded-full", DOT_CLASSES[tone])}
        />
      ) : null}
      {children}
    </span>
  );
}
