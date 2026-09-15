import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageSearch } from "lucide-react";

import { RequestStatusBadge, UrgencyBadge } from "@/components/domain-badges";
import { RequestDecisionPanel } from "@/components/requisition-forms";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import type { RequestStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDateTime,
  formatRelative,
  REQUEST_STATUS_LABELS,
} from "@/lib/display";
import { can } from "@/lib/permissions";
import { getLocations, locationChoices } from "@/lib/locations";
import { nextRequestStatuses } from "@/lib/workflow";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/requisitions/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const request = await prisma.procurementRequest.findUnique({
    where: { id },
    select: { itemName: true },
  });

  return { title: request ? `Request: ${request.itemName}` : "Request" };
}

function statusLabel(value: RequestStatus | null): string {
  return value ? REQUEST_STATUS_LABELS[value] : "Raised";
}

export default async function RequisitionDetailPage(
  props: PageProps<"/requisitions/[id]">,
) {
  const { id } = await props.params;
  const user = await requireUser(`/requisitions/${id}`);

  const request = await prisma.procurementRequest.findUnique({
    where: { id },
    include: {
      requestedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
      tool: { select: { id: true, name: true, quantity: true, unit: true, status: true } },
      events: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true } } },
      },
    },
  });

  if (!request) notFound();

  const canDecide = can(user.role, "requisition:decide");

  // Only needed when this request can still be received as a new item.
  const [categoryRows, locations] = canDecide && !request.tool
    ? await Promise.all([
        prisma.tool.findMany({
          distinct: ["category"],
          select: { category: true },
          orderBy: { category: "asc" },
        }),
        getLocations(),
      ])
    : [[], []];

  const facts = [
    {
      label: "Quantity requested",
      value: `${request.quantityRequested} ${request.unit}`,
    },
    { label: "Raised by", value: request.requestedBy.name },
    { label: "Raised", value: formatDateTime(request.createdAt) },
    {
      label: "Decided by",
      value: request.approvedBy?.name ?? "Not decided yet",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Procurement request"
        title={request.itemName}
        backHref="/requisitions"
        backLabel="Back to requests"
        description={
          <div className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <UrgencyBadge urgency={request.urgency} />
            <span className="text-muted">
              Raised {formatRelative(request.createdAt)}
            </span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={fact.label}>
                    <dt className="text-xs font-medium tracking-wide text-muted uppercase">
                      {fact.label}
                    </dt>
                    <dd className="mt-1 text-sm text-ink">{fact.value}</dd>
                  </div>
                ))}
              </dl>

              {request.reason ? (
                <div className="mt-5 rounded-lg border border-line bg-surface-sunken p-3">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Why it is needed
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-body">
                    {request.reason}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="History"
              description="Every step, with who did it and when."
            />

            <ol className="divide-y divide-line">
              {request.events.map((event) => (
                <li key={event.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="text-sm font-medium text-ink">
                      {event.fromStatus
                        ? `${statusLabel(event.fromStatus)} → ${statusLabel(event.toStatus)}`
                        : "Request raised"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDateTime(event.createdAt)}
                    </p>
                  </div>

                  {event.note ? (
                    <p className="mt-1 text-sm text-body">{event.note}</p>
                  ) : null}

                  <p className="mt-1 text-xs text-muted">
                    by {event.actor?.name ?? "Unknown"}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title={canDecide ? "Move this on" : "Progress"} />
            <CardBody>
              {canDecide ? (
                <RequestDecisionPanel
                  requestId={request.id}
                  status={request.status}
                  options={nextRequestStatuses(request.status)}
                  linkedToolName={request.tool?.name ?? null}
                  itemName={request.itemName}
                  quantityLabel={`${request.quantityRequested} ${request.unit}`}
                  approverName={request.approvedBy?.name ?? user.name}
                  categories={categoryRows.map((row) => row.category)}
                  locations={locationChoices(locations)}
                />
              ) : (
                <p className="text-sm text-body">
                  This request is{" "}
                  <span className="font-medium text-ink">
                    {REQUEST_STATUS_LABELS[request.status].toLowerCase()}
                  </span>
                  . An inventory manager or super admin moves it to the next
                  stage.
                </p>
              )}
            </CardBody>
          </Card>

          {request.tool ? (
            <Card>
              <CardHeader title="Linked item" />
              <CardBody>
                <Link
                  href={`/tools/${request.tool.id}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <PackageSearch
                    className="mt-0.5 size-4 shrink-0 text-muted"
                    aria-hidden
                  />
                  <span>
                    <span className="block font-medium text-brand">
                      {request.tool.name}
                    </span>
                    <span className="tabular block text-muted">
                      {request.tool.quantity} {request.tool.unit} in stock
                    </span>
                  </span>
                </Link>
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-body">
                  This item is not in the inventory yet. Once it arrives, add it
                  so the team can find it.
                </p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
