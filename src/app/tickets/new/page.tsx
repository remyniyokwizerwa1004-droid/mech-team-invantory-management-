import type { Metadata } from "next";

import { NewTicketForm } from "@/components/ticket-forms";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Report a problem" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function NewTicketPage(props: PageProps<"/tickets/new">) {
  await requirePermission("ticket:create", "/tickets/new");

  const toolId = first((await props.searchParams).toolId);

  const tools = await prisma.tool.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Maintenance"
        title="Report a problem"
        description="Anything broken, worn or behaving oddly. The job stays attached to the tool's history."
        backHref="/tickets"
        backLabel="Back to maintenance"
      />

      <Card>
        <CardBody>
          <NewTicketForm tools={tools} defaultToolId={toolId} />
        </CardBody>
      </Card>
    </div>
  );
}
