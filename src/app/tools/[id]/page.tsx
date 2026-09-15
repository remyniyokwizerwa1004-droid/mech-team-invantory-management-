import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  ClipboardList,
  History,
  MapPin,
  PackageOpen,
  Pencil,
  ShoppingCart,
  UserRound,
  Wrench,
} from "lucide-react";

import {
  SeverityBadge,
  TicketProgressNote,
  TicketStatusBadge,
  ToolStatusBadge,
} from "@/components/domain-badges";
import { QuickStock } from "@/components/quick-stock";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { ToolStatus } from "@/generated/prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDateTime,
  formatRelative,
  INVENTORY_ACTION_LABELS,
  TOOL_STATUS_LABELS,
} from "@/lib/display";
import { contactFor, getLocations, whereToFind } from "@/lib/locations";
import { can } from "@/lib/permissions";
import { photoUrl } from "@/lib/photos";

export const dynamic = "force-dynamic";

export async function generateMetadata(
  props: PageProps<"/tools/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const tool = await prisma.tool.findUnique({
    where: { id },
    select: { name: true },
  });

  return { title: tool?.name ?? "Tool" };
}

/** Audit values are stored raw, so status codes get their label back here. */
function logValue(field: string | null, value: string | null): string {
  if (!value) return "—";
  if (field === "status" && value in TOOL_STATUS_LABELS) {
    return TOOL_STATUS_LABELS[value as ToolStatus];
  }
  return value;
}

export default async function ToolDetailPage(props: PageProps<"/tools/[id]">) {
  const { id } = await props.params;

  const [tool, user, locations] = await Promise.all([
    prisma.tool.findUnique({
      where: { id },
      include: {
        createdBy: { select: { name: true } },
        holder: { select: { name: true } },
        photo: { select: { id: true, width: true, height: true } },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 30,
          include: { performedBy: { select: { name: true } } },
        },
        tickets: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            createdAt: true,
            assignedTo: { select: { name: true } },
          },
        },
        requests: {
          where: { status: { in: ["REQUESTED", "APPROVED", "ORDERED"] } },
          orderBy: { createdAt: "desc" },
          take: 3,
          select: {
            id: true,
            quantityRequested: true,
            unit: true,
            status: true,
          },
        },
      },
    }),
    getCurrentUser(),
    getLocations(),
  ]);

  if (!tool) notFound();

  const canEdit = user ? can(user.role, "tool:write") : false;
  const canRaise = user ? can(user.role, "requisition:create") : false;
  const canOpenTicket = user ? can(user.role, "ticket:create") : false;

  // Somewhere like the office keeps things on a person's desk rather than in
  // a labelled place, so the location carries a name to ask for.
  const askFor = contactFor(locations, tool.storageLocationId);
  const find = whereToFind(locations, tool);

  const facts = [
    {
      label: "Quantity",
      value: (
        <span className="tabular">
          {tool.quantity} <span className="text-muted">{tool.unit}</span>
        </span>
      ),
    },
    {
      label: "Location",
      value: (
        <span className="inline-flex items-start gap-1.5">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-muted" aria-hidden />
          <span className={find.placed ? undefined : "font-medium text-warning"}>
            {find.text}
          </span>
        </span>
      ),
    },
    ...(askFor
      ? [
          {
            label: "Who to ask",
            value: (
              <span className="inline-flex items-center gap-1.5">
                <UserRound className="size-3.5 text-muted" aria-hidden />
                {askFor}
              </span>
            ),
          },
        ]
      : []),
    {
      label: "Low-stock level",
      value: (
        <span className="tabular">
          {tool.lowStockThreshold} {tool.unit}
        </span>
      ),
    },
    { label: "Category", value: tool.category },
    {
      label: "Last updated",
      value: `${formatDateTime(tool.updatedAt)} (${formatRelative(tool.updatedAt)})`,
    },
    { label: "Added by", value: tool.createdBy?.name ?? "Unknown" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={tool.category}
        title={tool.name}
        backHref="/"
        backLabel="Back to inventory"
        description={
          <div className="flex flex-wrap items-center gap-2">
            <ToolStatusBadge status={tool.status} />
            <span className="text-muted">
              Updated {formatRelative(tool.updatedAt)}
            </span>
          </div>
        }
        action={
          canEdit ? (
            <Link
              href={`/tools/${tool.id}/edit`}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              <Pencil className="size-3.5" aria-hidden />
              Edit
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {!find.placed ? (
            <div className="flex flex-wrap items-start gap-3 rounded-card border border-warning-line bg-warning-soft p-4">
              <PackageOpen className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-warning">Not put away yet</p>
                <p className="mt-0.5 text-sm text-body">
                  {find.askName ? (
                    <>
                      This item has no storage location. To find it, ask{" "}
                      <span className="font-medium text-ink">{find.askName}</span>.
                    </>
                  ) : (
                    "This item has no storage location yet."
                  )}
                </p>
              </div>
              {canEdit ? (
                <Link
                  href={`/tools/${tool.id}/edit`}
                  className={buttonClasses({ size: "sm" })}
                >
                  <MapPin className="size-3.5" aria-hidden />
                  Give it a location
                </Link>
              ) : null}
            </div>
          ) : null}

          {tool.photo ? (
            <Card className="overflow-hidden">
              <Image
                src={photoUrl(tool.photo.id)}
                alt={`Photo of ${tool.name}`}
                width={tool.photo.width}
                height={tool.photo.height}
                unoptimized
                fetchPriority="high"
                className="max-h-[28rem] w-full bg-surface-sunken object-contain"
              />
            </Card>
          ) : canEdit ? (
            <Link
              href={`/tools/${tool.id}/edit#photo`}
              className="flex items-center gap-3 rounded-card border border-dashed border-line-strong bg-surface p-4 text-sm text-body transition-colors hover:border-brand-line hover:text-ink"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-sunken">
                <Camera className="size-4 text-muted" aria-hidden />
              </span>
              <span>
                <span className="block font-medium text-ink">Add a photo</span>
                <span className="block text-muted">
                  Help people recognise this item when they search for it.
                </span>
              </span>
            </Link>
          ) : null}

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

              {tool.notes ? (
                <div className="mt-5 rounded-lg border border-line bg-surface-sunken p-3">
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    Notes
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-line text-body">
                    {tool.notes}
                  </p>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {canEdit ? (
            <Card>
              <CardHeader
                title="Update stock"
                description="For a quick correction. Use Edit for anything else."
              />
              <CardBody>
                <QuickStock
                  toolId={tool.id}
                  quantity={tool.quantity}
                  unit={tool.unit}
                  retired={tool.status === "RETIRED"}
                />
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="History"
              description="Every change to this item, most recent first."
            />

            {tool.logs.length === 0 ? (
              <EmptyState
                icon={History}
                title="No changes recorded yet"
                description="Edits made from now on will appear here."
              />
            ) : (
              <ol className="divide-y divide-line">
                {tool.logs.map((log) => (
                  <li key={log.id} className="px-5 py-3.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-ink">
                        {INVENTORY_ACTION_LABELS[log.action]}
                      </p>
                      <p className="text-xs text-muted">
                        {formatDateTime(log.createdAt)}
                      </p>
                    </div>

                    {log.oldValue || log.newValue ? (
                      <p className="mt-1 text-sm text-body">
                        <span className="text-muted line-through">
                          {logValue(log.field, log.oldValue)}
                        </span>
                        <span className="mx-1.5 text-muted" aria-label="changed to">
                          →
                        </span>
                        <span className="font-medium text-ink">
                          {logValue(log.field, log.newValue)}
                        </span>
                      </p>
                    ) : null}

                    {log.note ? (
                      <p className="mt-1 text-sm text-body">{log.note}</p>
                    ) : null}

                    <p className="mt-1 text-xs text-muted">
                      by {log.performedBy?.name ?? "Unknown"}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {user ? (
            <Card>
              <CardHeader title="Actions" />
              <CardBody className="space-y-2">
                {canRaise ? (
                  <Link
                    href={`/requisitions/new?toolId=${tool.id}`}
                    className={buttonClasses({
                      variant: "secondary",
                      className: "w-full justify-start",
                    })}
                  >
                    <ShoppingCart className="size-4" aria-hidden />
                    Request more of this
                  </Link>
                ) : null}

                {canOpenTicket ? (
                  <Link
                    href={`/tickets/new?toolId=${tool.id}`}
                    className={buttonClasses({
                      variant: "secondary",
                      className: "w-full justify-start",
                    })}
                  >
                    <Wrench className="size-4" aria-hidden />
                    Report a problem
                  </Link>
                ) : null}
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardBody>
                <p className="text-sm text-body">
                  Signed-in team members can request more of this item or report
                  a fault with it.
                </p>
                <Link
                  href={`/login?next=${encodeURIComponent(`/tools/${tool.id}`)}`}
                  className={buttonClasses({ size: "sm", className: "mt-3" })}
                >
                  Sign in
                </Link>
              </CardBody>
            </Card>
          )}

          {tool.requests.length > 0 ? (
            <Card>
              <CardHeader title="On order" />
              <CardBody className="space-y-2">
                {tool.requests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/requisitions/${request.id}`}
                    className="tabular block text-sm text-brand hover:text-brand-dark"
                  >
                    {request.quantityRequested} {request.unit} ·{" "}
                    {request.status.toLowerCase()}
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Maintenance" />

            {tool.tickets.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No faults reported"
                description="This item has a clean record."
              />
            ) : (
              <ul className="divide-y divide-line">
                {tool.tickets.map((ticket) => (
                  <li key={ticket.id}>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="block px-5 py-3 transition-colors hover:bg-surface-sunken"
                    >
                      <p className="text-sm font-medium text-ink">
                        {ticket.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <TicketStatusBadge status={ticket.status} />
                        <SeverityBadge severity={ticket.severity} />
                      </div>

                      <TicketProgressNote ticket={ticket} className="mt-1.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
