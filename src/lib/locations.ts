import "server-only";

import { prisma } from "@/lib/db";

export type LocationNode = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
};

/** Every location, parents before children, with a display path per row. */
export async function getLocations(): Promise<LocationNode[]> {
  return prisma.storageLocation.findMany({
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    select: { id: true, name: true, code: true, parentId: true },
  });
}

/** "Main Workshop › Shelf A", walking up as many levels as exist. */
export function pathFor(locations: LocationNode[], id: string | null): string {
  if (!id) return "Unassigned";

  const byId = new Map(locations.map((l) => [l.id, l]));
  const parts: string[] = [];

  let current = byId.get(id);
  let guard = 0;

  while (current && guard < 10) {
    parts.unshift(current.name);
    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }

  return parts.join(" › ") || "Unassigned";
}

/**
 * A location and everything nested under it. Filtering the inventory by
 * "Main Workshop" should find the tools sitting on its shelves, not just the
 * ones assigned to the room itself.
 */
export function withDescendants(
  locations: LocationNode[],
  id: string,
): string[] {
  const ids = [id];

  for (let index = 0; index < ids.length; index += 1) {
    for (const location of locations) {
      if (location.parentId === ids[index] && !ids.includes(location.id)) {
        ids.push(location.id);
      }
    }
  }

  return ids;
}

/** Options for a <select>, indented so the nesting is visible. */
export function locationOptions(
  locations: LocationNode[],
): Array<{ id: string; label: string }> {
  const roots = locations.filter((l) => l.parentId === null);
  const options: Array<{ id: string; label: string }> = [];

  function walk(node: LocationNode, depth: number) {
    options.push({
      id: node.id,
      label: `${"  ".repeat(depth)}${depth > 0 ? "› " : ""}${node.name}`,
    });

    for (const child of locations.filter((l) => l.parentId === node.id)) {
      walk(child, depth + 1);
    }
  }

  for (const root of roots) walk(root, 0);

  return options;
}
