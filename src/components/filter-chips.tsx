import Link from "next/link";

import { cn } from "@/lib/utils";

/** Status filters as links, so they work without JavaScript and stay linkable. */
export function FilterChips({
  basePath,
  paramName = "status",
  active,
  options,
}: {
  basePath: string;
  paramName?: string;
  active: string;
  options: Array<{ value: string; label: string; count?: number }>;
}) {
  return (
    <nav
      aria-label="Filter by status"
      className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
    >
      {options.map((option) => {
        const isActive = active === option.value;
        const href = option.value
          ? `${basePath}?${paramName}=${option.value}`
          : basePath;

        return (
          <Link
            key={option.value || "all"}
            href={href}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "border-brand bg-brand text-white"
                : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "tabular text-xs",
                  isActive ? "text-white/80" : "text-muted",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
