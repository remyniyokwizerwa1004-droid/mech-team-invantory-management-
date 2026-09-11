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
import { getLocations, locationOptions, pathFor, withDescendants } from "@/lib/locations";
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
      updatedAt: true,
    },
  });

  const countFor = (value: ToolStatus) =>
    statusCounts.find((row) => row.status === value)?._count._all ?? 0;

  const totalItems = statusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const isFiltered = Boolean(q || category || status || locationId);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
            Tool and material inventory
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-body">
            Search what the mechanical team has, whether it is in stock, and
            exactly where it is kept. No sign-in needed to look something up.
          </p>
        </div>

        {user && can(user.role, "tool:write") ? (
          <div className="flex flex-wrap items-center gap-2">
            {can(user.role, "tool:delete") ? (
              <Link
                href="/tools/manage"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                <Settings2 className="size-4" aria-hidden />
                Manage items
              </Link>
            ) : null}

            <Link href="/tools/new" className={buttonClasses({ size: "sm" })}>
              <Plus className="size-4" aria-hidden />
              Add tool
            </Link>
          </div>
        ) : null}
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="In stock"
          value={countFor("AVAILABLE")}
          hint="Ready to use"
          tone="positive"
          icon={CircleCheck}
          href="/?status=AVAILABLE"
        />
        <StatTile
          label="Low stock"
          value={countFor("LOW_STOCK")}
          hint="At or below the reorder point"
          tone="warning"
          icon={CircleAlert}
          href="/?status=LOW_STOCK"
        />
        <StatTile
          label="Finished"
          value={countFor("FINISHED")}
          hint="None left"
          tone="critical"
          icon={CircleSlash}
          href="/?status=FINISHED"
        />
        <StatTile
          label="Tracked items"
          value={totalItems}
          hint="Across every location"
          tone="neutral"
          icon={PackageSearch}
          href="/"
        />
      </div>

      <InventoryFilters
        values={{ q, category, status, location: locationId }}
        categories={categoryRows.map((row) => row.category)}
        locations={locationOptions(locations)}
      />

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
                        {pathFor(locations, tool.storageLocationId)}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{formatRelative(tool.updatedAt)}</span>
                    </p>

                    <p className="tabular hidden text-sm text-body md:block">
                      {tool.quantity}{" "}
                      <span className="text-muted">{tool.unit}</span>
                    </p>

                    <p className="hidden truncate text-sm text-body md:block">
                      {pathFor(locations, tool.storageLocationId)}
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
