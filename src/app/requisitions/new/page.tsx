import type { Metadata } from "next";

import { NewRequestForm } from "@/components/requisition-forms";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "New request" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function NewRequisitionPage(
  props: PageProps<"/requisitions/new">,
) {
  await requirePermission("requisition:create", "/requisitions/new");

  const toolId = first((await props.searchParams).toolId);

  const tools = await prisma.tool.findMany({
    where: { status: { not: "RETIRED" } },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: { id: true, name: true, unit: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Procurement"
        title="Request an item"
        description="For anything that has run low, run out, or that the team does not stock yet."
        backHref="/requisitions"
        backLabel="Back to requests"
      />

      <Card>
        <CardBody>
          <NewRequestForm tools={tools} defaultToolId={toolId} />
        </CardBody>
      </Card>
    </div>
  );
}
