import type { Metadata } from "next";

import { ToolForm } from "@/components/tool-form";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocations, locationOptions } from "@/lib/locations";

export const metadata: Metadata = { title: "Add a tool" };
export const dynamic = "force-dynamic";

export default async function NewToolPage() {
  await requirePermission("tool:write", "/tools/new");

  const [categories, locations] = await Promise.all([
    prisma.tool.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    getLocations(),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="Inventory"
        title="Add a tool or material"
        description="It appears in the public search as soon as you save."
        backHref="/"
        backLabel="Back to inventory"
      />

      <ToolForm
        categories={categories.map((row) => row.category)}
        locations={locationOptions(locations)}
      />
    </div>
  );
}
