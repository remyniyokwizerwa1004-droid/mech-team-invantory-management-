import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";

/**
 * Keeps a long list to one screenful per request. Without it the page renders
 * every matching row, which is fine at a few hundred items and unusable at a
 * few thousand.
 */
export function Pagination({
  page,
  pageCount,
  total,
  perPage,
  basePath,
  params,
  noun = "items",
}: {
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  basePath: string;
  /** The current filters, carried through so paging keeps them. */
  params: Record<string, string>;
  noun?: string;
}) {
  if (total === 0) return null;

  const hrefFor = (target: number) => {
    const search = new URLSearchParams();

    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }

    if (target > 1) search.set("page", String(target));

    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <p className="tabular text-sm text-muted">
        Showing {from} to {to} of {total} {noun}
      </p>

      {pageCount > 1 ? (
        <div className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Previous
            </Link>
          ) : (
            <span
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "pointer-events-none opacity-50",
              })}
            >
              <ChevronLeft className="size-3.5" aria-hidden />
              Previous
            </span>
          )}

          <span className="tabular text-sm text-body">
            Page {page} of {pageCount}
          </span>

          {page < pageCount ? (
            <Link
              href={hrefFor(page + 1)}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </Link>
          ) : (
            <span
              className={buttonClasses({
                variant: "secondary",
                size: "sm",
                className: "pointer-events-none opacity-50",
              })}
            >
              Next
              <ChevronRight className="size-3.5" aria-hidden />
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}
