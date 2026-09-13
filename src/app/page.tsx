import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  CircleAlert,
  CircleCheck,
  CircleSlash,
  MapPin,
  PackageSearch,
  Plus,
  SearchX,
  Settings2,
} from "lucide-react";

import { InventoryFilters } from "@/components/inventory-filters";
import { ToolStatusBadge } from "@/components/domain-badges";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { StatTile } from "@/components/ui/stat-tile";
import type { Prisma, ToolStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRelative, TOOL_STATUS_LABELS } from "@/lib/display";
import {
  fullLocation,
  getLocations,
  locationOptions,
  withDescendants,
} from "@/lib/locations";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const STATUSES: ToolStatus[] = ["AVAILABLE", "LOW_STOCK", "FINISHED", "RETIRED"];

/** One screenful per request, so the page stays fast however big stock gets. */
const PER_PAGE = 50;

export default async function InventoryPage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;

  const q = first(searchParams.q);
  const category = first(searchParams.category);
  const statusParam = first(searchParams.status);
  const locationId = first(searchParams.location);

  const status = STATUSES.includes(statusParam as ToolStatus)
    ? (statusParam as ToolStatus)
    : "";

  const [user, locations, categoryRows, statusCounts] = await Promise.all([
    getCurrentUser(),
    getLocations(),
    prisma.tool.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.tool.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const where: Prisma.ToolWhereInput = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
      { notes: { contains: q, mode: "insensitive" } },
    ];
  }

  if (category) where.category = category;
  if (status) where.status = status;

  // Picking a room should find what is on its shelves, not just what is
  // filed against the room itself.
  if (locationId) {
    where.storageLocationId = { in: withDescendants(locations, locationId) };
  }

  const matchCount = await prisma.tool.count({ where });
  const pageCount = Math.max(1, Math.ceil(matchCount / PER_PAGE));

  const requestedPage = Number(first(searchParams.page)) || 1;
  const page = Math.min(Math.max(1, requestedPage), pageCount);

  const tools = await prisma.tool.findMany({
    where,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    skip: (page - 1) * PER_PAGE,
    take: PER_PAGE,
    select: {
      id: true,
      name: true,
      category: true,
      quantity: true,
      unit: true,
      status: true,
      storageLocationId: true,
      locationDetail: true,
      updatedAt: true,
    },
  });

  const countFor = (value: ToolStatus) =>
    statusCounts.find((row) => row.status === value)?._count._all ?? 0;

  const totalItems = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const isFiltered = Boolean(q || category || status || locationId);

  return (
    <div className="space-y-6">
      {/*
        The banner breaks out of the page column to run edge to edge, and pulls
        up under the header so there is no strip of page between them. The
        photo is decoration; the tint over it is darkest on the left, where the
        headline sits, so white text stays readable wherever the image is busy.
      */}
      <section className="relative isolate -mt-8 mx-[calc(50%-50vw)] overflow-hidden">
        <Image
          src="/images/workshop-tool-wall.webp"
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          fetchPriority="high"
          className="-z-20 object-cover object-[center_40%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-linear-to-r from-hero/95 via-hero-mid/85 to-hero-light/70"
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 -z-10 h-32 bg-linear-to-t from-hero/70 to-transparent"
        />

        <div className="mx-auto max-w-6xl px-4 pt-10 pb-10 sm:px-6 sm:pt-14 sm:pb-12">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
                Mechanical team · Teleoperation robots
              </p>
              <h1 className="mt-3 text-3xl leading-tight font-semibold tracking-tight text-balance text-white sm:text-5xl">
                Find any tool, its stock level and exactly where it is stored.
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-pretty text-white/80 sm:text-base">
                Open to the whole team, with no sign-in needed to search.
                Signing in unlocks editing, requests, maintenance and reporting.
              </p>
            </div>

            {user && can(user.role, "tool:write") ? (
              <div className="flex flex-wrap items-center gap-2">
                {can(user.role, "tool:delete") ? (
                  <Link
                    href="/tools/manage"
                    className={buttonClasses({
                      variant: "secondary",
                      size: "sm",
                      className:
                        "border-white/25 bg-white/10 text-white hover:bg-white/20",
                    })}
                  >
                    <Settings2 className="size-4" aria-hidden />
                    Manage items
                  </Link>
                ) : null}

                <Link
                  href="/tools/new"
                  className={buttonClasses({
                    size: "sm",
                    className:
                      "bg-white text-hero hover:bg-white/90 active:bg-white/90",
                  })}
                >
                  <Plus className="size-4" aria-hidden />
                  Add tool
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <InventoryFilters
              values={{ q, category, status, location: locationId }}
              categories={categoryRows.map((row) => row.category)}
              locations={locationOptions(locations)}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              variant="glass"
              label="Items tracked"
              value={totalItems}
              tone="neutral"
              icon={PackageSearch}
              href="/"
            />
            <StatTile
              variant="glass"
              label="In stock"
              value={countFor("AVAILABLE")}
              tone="positive"
              icon={CircleCheck}
              href="/?status=AVAILABLE"
            />
            <StatTile
              variant="glass"
              label="Low stock"
              value={countFor("LOW_STOCK")}
              tone="warning"
              icon={CircleAlert}
              href="/?status=LOW_STOCK"
            />
            <StatTile
              variant="glass"
              label="Finished"
              value={countFor("FINISHED")}
              tone="critical"
              icon={CircleSlash}
              href="/?status=FINISHED"
            />
          </div>
        </div>
      </section>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <p className="text-sm text-body">
            <span className="font-semibold text-ink">{matchCount}</span>{" "}
            {matchCount === 1 ? "item" : "items"}
            {isFiltered ? " match your search" : " in the inventory"}
          </p>

          {status ? (
            <p className="text-xs text-muted">
              Showing {TOOL_STATUS_LABELS[status].toLowerCase()} only
            </p>
          ) : null}
        </div>

        {tools.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Nothing matches that search"
            description="Try a shorter word, or clear the filters to see everything the team has."
          />
        ) : (
          <>
            {/* Column headings, for the table-like layout on wider screens. */}
            <div className="hidden border-b border-line bg-surface-sunken px-4 py-2 text-xs font-medium tracking-wide text-muted uppercase md:grid md:grid-cols-[minmax(0,2.2fr)_8.5rem_7.5rem_minmax(0,1.5fr)_7rem_1rem] md:gap-4">
              <span>Item</span>
              <span>Status</span>
              <span>Quantity</span>
              <span>Location</span>
              <span>Updated</span>
              <span />
            </div>

            <ul className="divide-y divide-line">
              {tools.map((tool) => (
                <li key={tool.id}>
                  <Link
                    href={`/tools/${tool.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors hover:bg-surface-sunken md:grid-cols-[minmax(0,2.2fr)_8.5rem_7.5rem_minmax(0,1.5fr)_7rem_1rem] md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {tool.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {tool.category}
                      </p>
                    </div>

                    <div className="justify-self-end md:justify-self-start">
                      <ToolStatusBadge status={tool.status} />
                    </div>

                    {/* Compact summary line, phones only. */}
                    <p className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted md:hidden">
                      <span className="tabular font-medium text-body">
                        {tool.quantity} {tool.unit}
                      </span>
                      <span aria-hidden>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" aria-hidden />
                        {fullLocation(
                          locations,
                          tool.storageLocationId,
                          tool.locationDetail,
                        )}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{formatRelative(tool.updatedAt)}</span>
                    </p>

                    <p className="tabular hidden text-sm text-body md:block">
                      {tool.quantity}{" "}
                      <span className="text-muted">{tool.unit}</span>
                    </p>

                    <p className="hidden truncate text-sm text-body md:block">
                      {fullLocation(
                        locations,
                        tool.storageLocationId,
                        tool.locationDetail,
                      )}
                    </p>

                    <p className="hidden text-xs text-muted md:block">
                      {formatRelative(tool.updatedAt)}
                    </p>

                    <ChevronRight
                      className="hidden size-4 text-muted md:block"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination
              page={page}
              pageCount={pageCount}
              total={matchCount}
              perPage={PER_PAGE}
              basePath="/"
              params={{ q, category, status, location: locationId }}
            />
          </>
        )}
      </Card>
    </div>
  );
}
