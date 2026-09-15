import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

import { PhotoBackdrop } from "@/components/ui/photo-backdrop";

/**
 * The top of every signed-in page: the workshop photo edge to edge, with the
 * page's title, description and main action on it.
 *
 * It pulls up under the site header to close the page's top padding, so the
 * photo meets the header with no strip of grey between them. Everything inside
 * is scoped with `on-dark`, so badges, muted text and buttons passed in as the
 * description or action stay readable without each page restyling them.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  backHref,
  backLabel,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className="on-dark relative isolate -mt-8 mb-6 pt-7 pb-8 sm:pt-9 sm:pb-10">
      <PhotoBackdrop />

      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-white/80 hover:text-white"
        >
          <ChevronLeft className="size-4" aria-hidden />
          {backLabel ?? "Back"}
        </Link>
      ) : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-xs font-semibold tracking-[0.16em] text-white/70 uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance text-white sm:text-4xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-2 max-w-2xl text-sm text-pretty text-white/85 sm:text-base">
              {description}
            </div>
          ) : null}
        </div>

        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
