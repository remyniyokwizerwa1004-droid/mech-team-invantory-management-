import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-white shadow-card hover:bg-brand-dark active:bg-brand-dark",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-card hover:bg-surface-sunken",
  ghost: "text-body hover:bg-neutral-soft hover:text-ink",
  danger:
    "border border-critical-line bg-critical-soft text-critical hover:bg-critical hover:text-white",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
};

/**
 * Shared button styling. Exported separately so links can be styled as buttons
 * without nesting a <button> inside an <a>.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: Variant;
  size?: Size;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button {...props} className={buttonClasses({ variant, size, className })} />
  );
}
