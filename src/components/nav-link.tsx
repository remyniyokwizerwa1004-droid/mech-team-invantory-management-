"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export function NavLink({
  href,
  label,
  count,
  countLabel,
}: {
  href: string;
  label: string;
  /** Shown as a red pill. Use it for things that need someone's attention. */
  count?: number;
  countLabel?: string;
}) {
  const pathname = usePathname();

  // "/" would otherwise match every route, so it has to match exactly.
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative -mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors",
        isActive
          ? "border-brand text-brand"
          : "border-transparent text-body hover:border-line-strong hover:text-ink",
      )}
    >
      {label}

      {count ? (
        <span className="tabular inline-flex min-w-4 items-center justify-center rounded-full bg-critical px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-white">
          {count}
          {countLabel ? <span className="sr-only"> {countLabel}</span> : null}
        </span>
      ) : null}
    </Link>
  );
}
