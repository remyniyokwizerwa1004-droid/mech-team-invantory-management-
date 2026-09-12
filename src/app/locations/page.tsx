import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, MapPin, Plus } from "lucide-react";

import {
  DeleteLocationButton,
  LocationForm,
} from "@/components/location-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocations, locationOptions } from "@/lib/locations";

export const metadata: Metadata = { title: "Storage locations" };
export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  await requirePermission("location:write", "/locations");

  const [locations, toolCounts] = await Promise.all([
    prisma.storageLocation.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        parentId: true,
        detailLabel: true,
        detailHint: true,
        detailRequired: true,
        contactName: true,
      },
    }),
    prisma.tool.groupBy({
      by: ["storageLocationId"],
      _count: { _all: true },
    }),
  ]);

  const countFor = (id: string) =>
    toolCounts.find((row) => row.storageLocationId === id)?._count._all ?? 0;

  const options = locationOptions(await getLocations());

  // Flatten the tree into ordered rows, keeping the depth for indentation.
  const rows: Array<{ id: string; depth: number }> = [];

  function walk(parentId: string | null, depth: number) {
    for (const location of locations.filter((l) => l.parentId === parentId)) {
      rows.push({ id: location.id, depth });
      walk(location.id, depth + 1);
    }
  }

  walk(null, 0);

  const byId = new Map(locations.map((l) => [l.id, l]));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Storage locations"
        description="Where things are kept. Nest a shelf inside a room so searching the room finds everything on its shelves. Only a super admin can add or remove these, because every item is filed under one."
      />

      <Card>
        <CardHeader
          title="Add a location"
          description="Rooms first, then the shelves and bins inside them."
        />
        <CardBody>
          <LocationForm parents={options} submitLabel="Add location" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`${locations.length} ${locations.length === 1 ? "location" : "locations"}`}
          description="Open a row to rename or move it."
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Add your first room above, then add the shelves inside it."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ id, depth }) => {
              const location = byId.get(id);
              if (!location) return null;

              const count = countFor(id);

              return (
                <li key={id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken">
                      <span
                        style={{ width: `${depth * 1.25}rem` }}
                        aria-hidden
                      />

                      <ChevronDown
                        className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                        aria-hidden
                      />

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink">
                          {location.name}
                          {location.code ? (
                            <span className="ml-2 font-mono text-xs text-muted">
                              {location.code}
                            </span>
                          ) : null}
                        </span>
                        {location.description ? (
                          <span className="block truncate text-xs text-muted">
                            {location.description}
                          </span>
                        ) : null}
                      </span>

                      {count > 0 ? (
                        <Link
                          href={`/?location=${id}`}
                          className="shrink-0 text-xs font-medium text-brand hover:text-brand-dark"
                        >
                          {count} {count === 1 ? "item" : "items"}
                        </Link>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">Empty</span>
                      )}
                    </summary>

                    <div className="space-y-4 border-t border-line bg-surface-sunken px-5 py-4">
                      <LocationForm
                        location={location}
                        parents={options}
                        submitLabel="Save changes"
                      />

                      {count === 0 ? (
                        <div className="border-t border-line pt-4">
                          <DeleteLocationButton
                            id={location.id}
                            name={location.name}
                          />
                        </div>
                      ) : (
                        <p className="border-t border-line pt-4 text-xs text-muted">
                          Move the {count} {count === 1 ? "item" : "items"} out
                          before removing this location.
                        </p>
                      )}
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="flex items-center gap-2 text-sm text-muted">
        <Plus className="size-4" aria-hidden />
        Locations can nest as deep as you need: building, room, cabinet, shelf,
        bin.
      </p>
    </div>
  );
}
