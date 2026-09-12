import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { FilterChips } from "@/components/filter-chips";
import { SampleDataCard, ToolManager } from "@/components/tool-manager";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import type { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fullLocation, getLocations } from "@/lib/locations";
import { isSampleTool, SAMPLE_PREFIXES } from "@/lib/sample-data";

export const metadata: Metadata = { title: "Manage items" };
export const dynamic = "force-dynamic";

const PER_PAGE = 50;

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function ManageToolsPage(
  props: PageProps<"/tools/manage">,
) {
  await requirePermission("tool:delete", "/tools/manage");

  const searchParams = await props.searchParams;
  const scopeParam = first(searchParams.scope);
  const scope = scopeParam === "sample" || scopeParam === "own" ? scopeParam : "";

  const sampleFilter: Prisma.ToolWhereInput = {
    id: { startsWith: SAMPLE_PREFIXES.tool },
  };

  const where: Prisma.ToolWhereInput =
    scope === "sample"
      ? sampleFilter
      : scope === "own"
        ? { NOT: sampleFilter }
        : {};

  const [total, sampleCount, allCount] = await Promise.all([
    prisma.tool.count({ where }),
    prisma.tool.count({ where: sampleFilter }),
    prisma.tool.count(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  const requestedPage = Number(first(searchParams.page)) || 1;
  const page = Math.min(Math.max(1, requestedPage), pageCount);

  const [tools, locations] = await Promise.all([
    prisma.tool.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        name: true,
        category: true,
        quantity: true,
        unit: true,
        status: true,
        storageLocationId: true,
        locationDetail: true,
      },
    }),
    getLocations(),
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Inventory"
        title="Manage items"
        description="Remove items in bulk, clear out the example data, or jump straight to editing one."
        backHref="/"
        backLabel="Back to inventory"
        action={
          <Link href="/tools/new" className={buttonClasses({ size: "sm" })}>
            <Plus className="size-4" aria-hidden />
            Add tool
          </Link>
        }
      />

      <SampleDataCard sampleCount={sampleCount} />

      <FilterChips
        basePath="/tools/manage"
        paramName="scope"
        active={scope}
        options={[
          { value: "", label: "Everything", count: allCount },
          { value: "sample", label: "Sample data", count: sampleCount },
          {
            value: "own",
            label: "Added by your team",
            count: allCount - sampleCount,
          },
        ]}
      />

      <Card>
        <ToolManager
          tools={tools.map((tool) => ({
            id: tool.id,
            name: tool.name,
            category: tool.category,
            quantity: tool.quantity,
            unit: tool.unit,
            status: tool.status,
            location: fullLocation(
              locations,
              tool.storageLocationId,
              tool.locationDetail,
            ),
            isSample: isSampleTool(tool.id),
          }))}
        />

        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          perPage={PER_PAGE}
          basePath="/tools/manage"
          params={{ scope }}
        />
      </Card>
    </div>
  );
}
