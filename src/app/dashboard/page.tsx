import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  CircleAlert,
  CircleSlash,
  ClipboardList,
  MapPin,
  ShoppingCart,
  Wrench,
} from "lucide-react";

import {
  RequestStatusBadge,
  SeverityBadge,
  TicketStatusBadge,
  ToolStatusBadge,
} from "@/components/domain-badges";
import { BarList } from "@/components/ui/bar-list";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import type { ToolStatus } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatRelative,
  INVENTORY_ACTION_LABELS,
  TOOL_STATUS_LABELS,
} from "@/lib/display";
import { getLocations } from "@/lib/locations";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function logValue(field: string | null, value: string | null): string {
  if (!value) return "—";
  if (field === "status" && value in TOOL_STATUS_LABELS) {
    return TOOL_STATUS_LABELS[value as ToolStatus];
  }
  return value;
}

export default async function DashboardPage() {
  const user = await requirePermission("dashboard:view", "/dashboard");

  const [
    statusCounts,
    needsAttention,
    recentActivity,
    locationCounts,
    recentlyUpdated,
    openRequests,
    openTickets,
    locations,
  ] = await Promise.all([
    prisma.tool.groupBy({ by: ["status"], _count: { _all: true } }),

    prisma.tool.findMany({
      where: { status: { in: ["FINISHED", "LOW_STOCK"] } },
      orderBy: [{ status: "asc" }, { quantity: "asc" }],
      take: 8,
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        status: true,
        category: true,
      },
    }),

    prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        tool: { select: { id: true, name: true } },
        performedBy: { select: { name: true } },
      },
    }),

    prisma.tool.groupBy({
      by: ["storageLocationId"],
      _count: { _all: true },
    }),

    prisma.tool.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, name: true, updatedAt: true, status: true },
    }),

    prisma.procurementRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED", "ORDERED"] } },
      orderBy: [{ urgency: "desc" }, { createdAt: "asc" }],
      take: 5,
      include: { requestedBy: { select: { name: true } } },
    }),

    prisma.repairTicket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      orderBy: [{ severity: "desc" }, { createdAt: "asc" }],
      take: 5,
      include: {
        tool: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),

    getLocations(),
  ]);

  const countFor = (value: ToolStatus) =>
    statusCounts.find((row) => row.status === value)?._count._all ?? 0;

  // Roll every shelf and bin up to the room it sits in, so the chart compares
  // areas rather than a long list of individual bins.
  const byId = new Map(locations.map((l) => [l.id, l]));

  function rootOf(id: string | null): string | null {
    let current = id ? byId.get(id) : undefined;
    let guard = 0;

    while (current?.parentId && guard < 10) {
      current = byId.get(current.parentId);
      guard += 1;
    }

    return current?.id ?? null;
  }

  const areaTotals = new Map<string, number>();

  for (const row of locationCounts) {
    const rootId = rootOf(row.storageLocationId);
    const key = rootId ?? "unassigned";
    areaTotals.set(key, (areaTotals.get(key) ?? 0) + row._count._all);
  }

  const areas = [...areaTotals.entries()]
    .map(([id, value]) => ({
      id,
      label: id === "unassigned" ? "Not assigned" : (byId.get(id)?.name ?? id),
      value,
      href: id === "unassigned" ? undefined : `/?location=${id}`,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reporting"
        title={`Good to see you, ${user.name.split(" ")[0]}`}
        description="What needs attention across stock, procurement and repairs."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          hint="Nothing left on the shelf"
          tone="critical"
          icon={CircleSlash}
          href="/?status=FINISHED"
        />
        <StatTile
          label="Requests in flight"
          value={openRequests.length}
          hint="Awaiting approval, order or delivery"
          tone="info"
          icon={ShoppingCart}
          href="/requisitions"
        />
        <StatTile
          label="Open maintenance"
          value={openTickets.length}
          hint="Reported faults not yet resolved"
          tone="accent"
          icon={Wrench}
          href="/tickets"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Needs restocking"
            description="Lowest first. These are the items to order."
            action={
              <Link
                href="/requisitions/new"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                Raise a request
              </Link>
            }
          />

          {needsAttention.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Everything is stocked"
              description="No item is at or below its reorder point."
            />
          ) : (
            <ul className="divide-y divide-line">
              {needsAttention.map((tool) => (
                <li key={tool.id}>
                  <Link
                    href={`/tools/${tool.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {tool.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {tool.category}
                      </span>
                    </span>

                    <span className="tabular shrink-0 text-sm text-body">
                      {tool.quantity} {tool.unit}
                    </span>

                    <ToolStatusBadge status={tool.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent activity"
            description="Every stock change, newest first."
          />

          {recentActivity.length === 0 ? (
            <EmptyState icon={Activity} title="Nothing has changed yet" />
          ) : (
            <ol className="divide-y divide-line">
              {recentActivity.map((log) => (
                <li key={log.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <Link
                      href={`/tools/${log.tool.id}`}
                      className="truncate text-sm font-medium text-brand hover:text-brand-dark"
                    >
                      {log.tool.name}
                    </Link>
                    <span className="text-xs text-muted">
                      {formatRelative(log.createdAt)}
                    </span>
                  </div>

                  <p className="mt-0.5 text-xs text-body">
                    {INVENTORY_ACTION_LABELS[log.action]}
                    {log.oldValue || log.newValue ? (
                      <>
                        {": "}
                        <span className="text-muted">
                          {logValue(log.field, log.oldValue)}
                        </span>
                        {" → "}
                        <span className="font-medium text-ink">
                          {logValue(log.field, log.newValue)}
                        </span>
                      </>
                    ) : null}
                  </p>

                  <p className="text-xs text-muted">
                    by {log.performedBy?.name ?? "Unknown"}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Items by area"
            description="How the inventory is spread across the workshop."
          />
          <CardBody>
            {areas.length === 0 ? (
              <EmptyState icon={MapPin} title="No locations set up yet" />
            ) : (
              <BarList items={areas} unitLabel="items" />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Requests in flight"
            description="Most urgent and longest waiting first."
            action={
              <Link
                href="/requisitions"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                See all
              </Link>
            }
          />

          {openRequests.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Nothing on order"
              description="No requests are waiting on a decision or a delivery."
            />
          ) : (
            <ul className="divide-y divide-line">
              {openRequests.map((request) => (
                <li key={request.id}>
                  <Link
                    href={`/requisitions/${request.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {request.itemName}
                      </span>
                      <span className="tabular block truncate text-xs text-muted">
                        {request.quantityRequested} {request.unit} ·{" "}
                        {request.requestedBy.name}
                      </span>
                    </span>

                    <RequestStatusBadge status={request.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Open maintenance jobs"
            description="Most severe and longest open first."
            action={
              <Link
                href="/tickets"
                className="text-sm font-medium text-brand hover:text-brand-dark"
              >
                See all
              </Link>
            }
          />

          {openTickets.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="Nothing is broken"
              description="No faults are outstanding."
            />
          ) : (
            <ul className="divide-y divide-line">
              {openTickets.map((ticket) => (
                <li key={ticket.id}>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {ticket.title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {ticket.tool.name} ·{" "}
                        {ticket.assignedTo
                          ? ticket.assignedTo.name
                          : "unassigned"}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      <SeverityBadge severity={ticket.severity} />
                      <TicketStatusBadge status={ticket.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Most recently touched"
            description="The items the team has been working with."
          />

          <ul className="divide-y divide-line">
            {recentlyUpdated.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.id}`}
                  className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
                    {tool.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {formatRelative(tool.updatedAt)}
                  </span>
                  <ToolStatusBadge status={tool.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
