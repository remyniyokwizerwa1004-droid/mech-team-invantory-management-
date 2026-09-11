import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageSearch } from "lucide-react";

import {
  SeverityBadge,
  TicketProgressBadge,
  TicketStatusBadge,
} from "@/components/domain-badges";
import {
  AssignPanel,
  TicketNoteForm,
  TicketStatusPanel,
} from "@/components/ticket-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { TicketStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDateTime,
  formatRelative,
  TICKET_EVENT_LABELS,
  TICKET_STATUS_LABELS,
} from "@/lib/display";
import { can } from "@/lib/permissions";
import { nextTicketStatuses } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/tickets/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    select: { title: true },
  });

  return { title: ticket?.title ?? "Ticket" };
}

/** Status codes are stored raw in the event log, so label them for display. */
function eventValue(value: string | null): string {
  if (!value) return "—";
  if (value in TICKET_STATUS_LABELS) {
    return TICKET_STATUS_LABELS[value as TicketStatus];
  }
  return value;
}

export default async function TicketDetailPage(
  props: PageProps<"/tickets/[id]">,
) {
  const { id } = await props.params;
  const user = await requireUser(`/tickets/${id}`);

  const [ticket, people] = await Promise.all([
    prisma.repairTicket.findUnique({
      where: { id },
      include: {
        tool: {
          select: { id: true, name: true, category: true, status: true },
        },
        openedBy: { select: { name: true } },
        assignedTo: { select: { id: true, name: true } },
        events: {
          orderBy: { createdAt: "asc" },
          include: { actor: { select: { name: true } } },
        },
      },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!ticket) notFound();

  const canManage = can(user.role, "ticket:manage");

  const facts = [
    { label: "Tool", value: ticket.tool.name },
    { label: "Opened by", value: ticket.openedBy.name },
    { label: "Opened", value: formatDateTime(ticket.createdAt) },
    {
      label: "Assigned to",
      value: ticket.assignedTo?.name ?? "Nobody yet",
    },
    ...(ticket.resolvedAt
      ? [{ label: "Resolved", value: formatDateTime(ticket.resolvedAt) }]
      : []),
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Repair ticket"
        title={ticket.title}
        backHref="/tickets"
        backLabel="Back to tickets"
        description={
          <div className="flex flex-wrap items-center gap-2">
            <TicketStatusBadge status={ticket.status} />
            <SeverityBadge severity={ticket.severity} />
            <TicketProgressBadge ticket={ticket} />
            <span className="text-muted">
              Opened {formatRelative(ticket.createdAt)}
            </span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="The problem" />
            <CardBody>
              <p className="text-sm whitespace-pre-line text-body">
                {ticket.description}
              </p>

              <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-line pt-4 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-sm text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="History"
              description="Status changes, assignments and notes."
            />

            <ol className="divide-y divide-line">
              {ticket.events.map((event) => (
                <li key={event.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-ink">
                      {TICKET_EVENT_LABELS[event.type]}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>

                  {event.type === "STATUS_CHANGED" ? (
                    <p className="mt-1 text-sm text-body">
                      <span className="text-muted line-through">
                        {eventValue(event.fromValue)}
                      </span>
                      <span className="mx-1.5 text-muted" aria-label="changed to">
                        →
                      </span>
                      <span className="font-medium text-ink">
                        {eventValue(event.toValue)}
                      </span>
                    </p>
                  ) : null}

                  {event.type === "ASSIGNED" ? (
                    <p className="mt-1 text-sm text-body">
                      Now with{" "}
                      <span className="font-medium text-ink">
                        {event.toValue ?? "nobody"}
                      </span>
                    </p>
                  ) : null}

                  {event.note ? (
                    <p className="mt-1 text-sm whitespace-pre-line text-body">
                      {event.note}
                    </p>
                  ) : null}

                  <p className="mt-1 text-xs text-muted">
                    by {event.actor?.name ?? "Unknown"}
                  </p>
                </li>
              ))}
            </ol>

            <div className="border-t border-line px-5 py-4">
              <TicketNoteForm ticketId={ticket.id} />
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {canManage ? (
            <>
              <Card>
                <CardHeader title="Move this on" />
                <CardBody>
                  <TicketStatusPanel
                    ticketId={ticket.id}
                    status={ticket.status}
                    options={nextTicketStatuses(ticket.status)}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader title="Assignment" />
                <CardBody>
                  <AssignPanel
                    ticketId={ticket.id}
                    assignedToId={ticket.assignedTo?.id ?? null}
                    people={people}
                  />
                </CardBody>
              </Card>
            </>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-body">
                  This ticket is{" "}
                  <span className="font-medium text-ink">
                    {TICKET_STATUS_LABELS[ticket.status].toLowerCase()}
                  </span>
                  . An inventory manager or super admin assigns it and moves it
                  through. You can still add notes.
                </p>
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Affected item" />
            <CardBody>
              <Link
                href={`/tools/${ticket.tool.id}`}
                className="flex items-start gap-3 text-sm"
              >
                <PackageSearch
                  className="mt-0.5 size-4 shrink-0 text-muted"
                  aria-hidden
                />
                <span>
                  <span className="block font-medium text-brand">
                    {ticket.tool.name}
                  </span>
                  <span className="block text-muted">
                    {ticket.tool.category}
                  </span>
                </span>
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
