import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, TriangleAlert, Wrench } from "lucide-react";

import {
  SeverityBadge,
  TicketProgressNote,
  TicketStatusBadge,
} from "@/components/domain-badges";
import { FilterChips } from "@/components/filter-chips";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Prisma, TicketStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatRelative,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
} from "@/lib/display";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

const UNCLAIMED = "unclaimed";

/** Reported, still open, and nobody has been put on it. */
const UNATTENDED = { status: "OPEN", assignedToId: null } as const;

export default async function TicketsPage(props: PageProps<"/tickets">) {
  const user = await requireUser("/tickets");

  // One filter covering both axes people actually ask about: what stage is it
  // at, and is anyone on it. "unclaimed" is the second kind.
  const viewParam = first((await props.searchParams).view);
  const view = TICKET_STATUS_ORDER.includes(viewParam as TicketStatus)
    ? (viewParam as TicketStatus)
    : viewParam === UNCLAIMED
      ? UNCLAIMED
      : "";

  const where: Prisma.RepairTicketWhereInput =
    view === UNCLAIMED
      ? UNATTENDED
      : view
        ? { status: view as TicketStatus }
        : {};

  const [tickets, counts, unclaimedCount] = await Promise.all([
    prisma.repairTicket.findMany({
      where,
      // Unattended faults first, then the most severe, then the oldest, so the
      // thing nobody has picked up cannot quietly sink down the list.
      orderBy: [
        { assignedToId: { sort: "asc", nulls: "first" } },
        { severity: "desc" },
        { createdAt: "desc" },
      ],
      include: {
        tool: { select: { id: true, name: true } },
        openedBy: { select: { name: true } },
        assignedTo: { select: { name: true } },
      },
    }),
    prisma.repairTicket.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.repairTicket.count({ where: UNATTENDED }),
  ]);

  const countFor = (value: TicketStatus) =>
    counts.find((row) => row.status === value)?._count._all ?? 0;

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Maintenance"
        title="Maintenance"
        description={
          can(user.role, "ticket:manage")
            ? "Every fault reported against a tool, and who is dealing with it. Assign them and move them through to resolved."
            : "Every fault the team has reported, and who is dealing with it. Anyone can report one."
        }
        action={
          <Link href="/tickets/new" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            Report a problem
          </Link>
        }
      />

      {unclaimedCount > 0 ? (
        <Link
          href={`/tickets?view=${UNCLAIMED}`}
          className="flex items-start gap-3 rounded-xl border border-critical-line bg-critical-soft p-4 transition-colors hover:border-critical"
        >
          <TriangleAlert
            className="mt-0.5 size-5 shrink-0 text-critical"
            aria-hidden
          />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-critical">
              {unclaimedCount === 1
                ? "One problem has nobody on it"
                : `${unclaimedCount} problems have nobody on them`}
            </span>
            <span className="mt-0.5 block text-sm text-body">
              {unclaimedCount === 1 ? "It was" : "They were"} reported but
              {unclaimedCount === 1 ? " has" : " have"} not been given to
              anyone yet.{" "}
              {can(user.role, "ticket:manage")
                ? "Assign someone so the team knows it is being handled."
                : "A manager needs to assign someone."}
            </span>
          </span>
          <ChevronRight
            className="mt-0.5 hidden size-4 shrink-0 text-critical sm:block"
            aria-hidden
          />
        </Link>
      ) : null}

      <FilterChips
        basePath="/tickets"
        paramName="view"
        active={view}
        options={[
          { value: "", label: "All", count: total },
          { value: UNCLAIMED, label: "Nobody on it", count: unclaimedCount },
          ...TICKET_STATUS_ORDER.map((value) => ({
            value,
            label: TICKET_STATUS_LABELS[value],
            count: countFor(value),
          })),
        ]}
      />

      <Card>
        {tickets.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={
              view === UNCLAIMED
                ? "Everything has someone on it"
                : view
                  ? "Nothing at this stage"
                  : "Nothing needs maintenance"
            }
            description={
              view === UNCLAIMED
                ? "Every reported problem has been given to somebody."
                : view
                  ? "Try another filter to see the rest."
                  : "Nothing is reported as broken. Report a problem when something fails."
            }
            action={
              view ? null : (
                <Link href="/tickets/new" className={buttonClasses({ size: "sm" })}>
                  Report a problem
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {tickets.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  href={`/tickets/${ticket.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {ticket.title}
                    </p>

                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="truncate">{ticket.tool.name}</span>
                      <span aria-hidden>·</span>
                      <span>opened by {ticket.openedBy.name}</span>
                      <span aria-hidden>·</span>
                      <span>{formatRelative(ticket.createdAt)}</span>
                    </p>

                    <TicketProgressNote ticket={ticket} className="mt-1.5" />
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    <SeverityBadge severity={ticket.severity} />
                    <TicketStatusBadge status={ticket.status} />
                  </div>

                  <ChevronRight
                    className="hidden size-4 shrink-0 text-muted sm:block"
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
