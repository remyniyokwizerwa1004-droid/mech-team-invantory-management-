import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Plus, ShoppingCart } from "lucide-react";

import { RequestStatusBadge, UrgencyBadge } from "@/components/domain-badges";
import { FilterChips } from "@/components/filter-chips";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import type { Prisma, RequestStatus } from "@/generated/prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatRelative,
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_ORDER,
} from "@/lib/display";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Procurement requests" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function RequisitionsPage(
  props: PageProps<"/requisitions">,
) {
  const user = await requireUser("/requisitions");

  const statusParam = first((await props.searchParams).status);
  const status = REQUEST_STATUS_ORDER.includes(statusParam as RequestStatus)
    ? (statusParam as RequestStatus)
    : "";

  const where: Prisma.ProcurementRequestWhereInput = status ? { status } : {};

  const [requests, counts] = await Promise.all([
    prisma.procurementRequest.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      include: {
        requestedBy: { select: { name: true } },
        tool: { select: { id: true, name: true } },
      },
    }),
    prisma.procurementRequest.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countFor = (value: RequestStatus) =>
    counts.find((row) => row.status === value)?._count._all ?? 0;

  const total = counts.reduce((sum, row) => sum + row._count._all, 0);
  const canDecide = can(user.role, "requisition:decide");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Procurement"
        title="Requests"
        description={
          canDecide
            ? "Approve, order and receive what the team has asked for. Receiving an item can top up its stock automatically."
            : "Ask for more of something that is low or finished, and follow what happens to your request."
        }
        action={
          <Link href="/requisitions/new" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            New request
          </Link>
        }
      />

      <FilterChips
        basePath="/requisitions"
        active={status}
        options={[
          { value: "", label: "All", count: total },
          ...REQUEST_STATUS_ORDER.map((value) => ({
            value,
            label: REQUEST_STATUS_LABELS[value],
            count: countFor(value),
          })),
        ]}
      />

      <Card>
        {requests.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title={status ? "Nothing at this stage" : "No requests yet"}
            description={
              status
                ? "Try another filter to see the rest."
                : "When something runs low, raise a request so it gets ordered."
            }
            action={
              status ? null : (
                <Link
                  href="/requisitions/new"
                  className={buttonClasses({ size: "sm" })}
                >
                  Raise the first request
                </Link>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requisitions/${request.id}`}
                  className="flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-ink">
                      {request.itemName}
                    </p>

                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="tabular">
                        {request.quantityRequested} {request.unit}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{request.requestedBy.name}</span>
                      <span aria-hidden>·</span>
                      <span>{formatRelative(request.createdAt)}</span>
                      {request.tool ? null : (
                        <>
                          <span aria-hidden>·</span>
                          <span>not in inventory</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
                    <UrgencyBadge urgency={request.urgency} />
                    <RequestStatusBadge status={request.status} />
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
