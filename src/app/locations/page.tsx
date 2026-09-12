import type { Metadata } from "next";
import Link from "next/link";
import {
  Boxes,
  ChevronDown,
  MapPin,
  PackageX,
  Pencil,
  Plus,
} from "lucide-react";

import { ToolStatusBadge } from "@/components/domain-badges";
import {
  DeleteLocationButton,
  LocationForm,
} from "@/components/location-controls";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatTile } from "@/components/ui/stat-tile";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocations, locationOptions } from "@/lib/locations";

export const metadata: Metadata = { title: "Storage locations" };
export const dynamic = "force-dynamic";

/** How many items to list under a location before linking to the rest. */
const PREVIEW = 8;

export default async function LocationsPage() {
  await requirePermission("location:write", "/locations");

  const [locations, tools, unplaced] = await Promise.all([
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
    // Only the few fields the preview needs. Every row is fetched but at most
    // PREVIEW of them per location are rendered, which is what costs time.
    prisma.tool.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        quantity: true,
        unit: true,
        status: true,
        locationDetail: true,
        storageLocationId: true,
      },
    }),
    prisma.tool.count({ where: { storageLocationId: null } }),
  ]);

  const byLocation = new Map<string, typeof tools>();

  for (const tool of tools) {
    if (!tool.storageLocationId) continue;
    const list = byLocation.get(tool.storageLocationId) ?? [];
    list.push(tool);
    byLocation.set(tool.storageLocationId, list);
  }

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
  const placed = tools.length - unplaced;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Storage locations"
        description="Everywhere the team keeps things, and what is in each one. Nest a shelf inside a room so searching the room finds everything on its shelves."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Locations"
          value={locations.length}
          hint="Rooms, areas and the places inside them"
          tone="neutral"
          icon={MapPin}
        />
        <StatTile
          label="Items placed"
          value={placed}
          hint="Filed somewhere findable"
          tone="positive"
          icon={Boxes}
        />
        <StatTile
          label="Nowhere yet"
          value={unplaced}
          hint={
            unplaced === 0
              ? "Everything has a home"
              : "Searchable, but nobody knows where they are"
          }
          tone={unplaced === 0 ? "neutral" : "warning"}
          icon={PackageX}
          href={unplaced === 0 ? undefined : "/tools/manage"}
        />
      </div>

      <Card>
        <CardHeader
          title="What is where"
          description="Open a location to see what it holds."
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations yet"
            description="Add your first room below, then add the shelves inside it."
          />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ id, depth }) => {
              const location = byId.get(id);
              if (!location) return null;

              const held = byLocation.get(id) ?? [];
              const count = held.length;

              const subtitle =
                location.description ??
                (location.detailRequired && location.detailLabel
                  ? `Asks for ${location.detailLabel.toLowerCase()}`
                  : null);

              return (
                <li key={id}>
                  <details className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors hover:bg-surface-sunken">
                      <span style={{ width: `${depth * 1.25}rem` }} aria-hidden />

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
                        {subtitle ? (
                          <span className="block truncate text-xs text-muted">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>

                      {count > 0 ? (
                        <span className="tabular shrink-0 text-xs font-medium text-body">
                          {count} {count === 1 ? "item" : "items"}
                        </span>
                      ) : (
                        <span className="shrink-0 text-xs text-muted">Empty</span>
                      )}
                    </summary>

                    <div className="space-y-4 border-t border-line bg-surface-sunken px-5 py-4">
                      {count === 0 ? (
                        <p className="text-sm text-muted">
                          Nothing is kept here yet.
                        </p>
                      ) : (
                        <div>
                          <p className="text-xs font-medium tracking-wide text-muted uppercase">
                            What is in here
                          </p>

                          <ul className="mt-2 divide-y divide-line rounded-lg border border-line bg-surface">
                            {held.slice(0, PREVIEW).map((tool) => (
                              <li key={tool.id}>
                                <Link
                                  href={`/tools/${tool.id}`}
                                  className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-sunken"
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm text-ink">
                                      {tool.name}
                                    </span>
                                    {tool.locationDetail ? (
                                      <span className="block truncate text-xs text-muted">
                                        {tool.locationDetail}
                                      </span>
                                    ) : null}
                                  </span>

                                  <span className="tabular shrink-0 text-xs text-body">
                                    {tool.quantity} {tool.unit}
                                  </span>

                                  <ToolStatusBadge status={tool.status} />
                                </Link>
                              </li>
                            ))}
                          </ul>

                          {count > PREVIEW ? (
                            <Link
                              href={`/?location=${id}`}
                              className="mt-2 inline-block text-sm font-medium text-brand hover:text-brand-dark"
                            >
                              See all {count} items here
                            </Link>
                          ) : null}
                        </div>
                      )}

                      <details className="rounded-lg border border-line bg-surface">
                        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium text-ink">
                          <Pencil className="size-3.5 text-muted" aria-hidden />
                          Edit or remove this location
                        </summary>

                        <div className="space-y-4 border-t border-line px-3 py-3">
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
                              Move the {count} {count === 1 ? "item" : "items"}{" "}
                              out before removing this location.
                            </p>
                          )}
                        </div>
                      </details>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Add a location"
          description="Rooms and buildings first, then the shelves, drawers and bins inside them."
        />
        <CardBody>
          <LocationForm parents={options} submitLabel="Add location" />
        </CardBody>
      </Card>

      <p className="flex items-center gap-2 text-sm text-muted">
        <Plus className="size-4" aria-hidden />
        Locations can nest as deep as you need: building, room, cabinet, shelf,
        bin.
      </p>
    </div>
  );
}
