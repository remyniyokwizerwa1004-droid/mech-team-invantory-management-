import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Trash2, TriangleAlert } from "lucide-react";

import { ToolForm } from "@/components/tool-form";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { deleteTool } from "@/lib/actions/tools";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocations, locationChoices } from "@/lib/locations";
import { can } from "@/lib/permissions";

export const metadata: Metadata = { title: "Edit tool" };
export const dynamic = "force-dynamic";

export default async function EditToolPage(
  props: PageProps<"/tools/[id]/edit">,
) {
  const { id } = await props.params;

  const user = await requirePermission("tool:write", `/tools/${id}/edit`);

  const [tool, categories, locations] = await Promise.all([
    prisma.tool.findUnique({ where: { id } }),
    prisma.tool.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    getLocations(),
  ]);

  if (!tool) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inventory"
        title={`Edit ${tool.name}`}
        description="Changes are recorded in this item's history."
        backHref={`/tools/${tool.id}`}
        backLabel="Back to the tool"
      />

      <ToolForm
        tool={{
          id: tool.id,
          name: tool.name,
          category: tool.category,
          quantity: tool.quantity,
          unit: tool.unit,
          lowStockThreshold: tool.lowStockThreshold,
          storageLocationId: tool.storageLocationId ?? "",
          locationDetail: tool.locationDetail ?? "",
          notes: tool.notes ?? "",
          retired: tool.status === "RETIRED",
        }}
        categories={categories.map((row) => row.category)}
        locations={locationChoices(locations)}
      />

      {can(user.role, "tool:delete") ? (
        <Card className="mt-6 border-critical-line">
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium text-ink">
              <TriangleAlert className="size-4 text-critical" aria-hidden />
              Delete this item permanently
            </summary>

            <div className="border-t border-line px-5 py-4">
              <p className="text-sm text-body">
                Deleting removes {tool.name} along with its entire history and
                every maintenance job raised against it. That cannot be undone,
                and the audit trail goes with it.
              </p>

              <p className="mt-2 text-sm text-body">
                If the tool is simply broken or replaced, tick{" "}
                <span className="font-medium text-ink">Retired from service</span>{" "}
                above instead. It stays searchable and keeps its history.
              </p>

              <form action={deleteTool} className="mt-4">
                <input type="hidden" name="toolId" value={tool.id} />
                <button
                  type="submit"
                  className={buttonClasses({ variant: "danger", size: "sm" })}
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete {tool.name}
                </button>
              </form>
            </div>
          </details>
        </Card>
      ) : null}
    </div>
  );
}
