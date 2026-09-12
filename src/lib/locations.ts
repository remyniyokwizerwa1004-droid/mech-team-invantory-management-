import "server-only";

import { prisma } from "@/lib/db";

export type LocationNode = {
  id: string;
  name: string;
  code: string | null;
  parentId: string | null;
  /** What to call the exact-spot field here, e.g. "Drawer number". */
  detailLabel: string | null;
  /** Guidance shown under that field, e.g. "for example Locker 04". */
  detailHint: string | null;
  /** Whether an item here must say exactly where it sits. */
  detailRequired: boolean;
  /** Who to ask about things kept here. */
  contactName: string | null;
};

/** Every location, parents before children, with a display path per row. */
export async function getLocations(): Promise<LocationNode[]> {
  return prisma.storageLocation.findMany({
    orderBy: [{ parentId: { sort: "asc", nulls: "first" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      parentId: true,
      detailLabel: true,
      detailHint: true,
      detailRequired: true,
      contactName: true,
    },
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

/**
 * The whole answer to "where is it?": the nested path, then the exact spot
 * the person who put it away typed in.
 *
 *   "Warehouse 1 › Drawers — Locker 04"
 *
 * Everyone sees the same string, including the public search. Knowing the
 * room is not the same as being able to put your hand on the thing.
 */
export function fullLocation(
  locations: LocationNode[],
  id: string | null,
  detail: string | null,
): string {
  const path = pathFor(locations, id);
  const spot = detail?.trim();

  return spot ? `${path} — ${spot}` : path;
}

/**
 * The guidance a location gives for its exact-spot field. Falls back to a
 * sensible generic prompt so a location added later still asks something
 * useful without anyone configuring it.
 */
export function detailGuidance(location: LocationNode | undefined): {
  label: string;
  hint: string;
  required: boolean;
} {
  return {
    label: location?.detailLabel?.trim() || "Exact spot",
    hint:
      location?.detailHint?.trim() ||
      "Where precisely someone should look once they get there.",
    required: location?.detailRequired ?? false,
  };
}

/** Walks up from a location to find the nearest contact person. */
export function contactFor(
  locations: LocationNode[],
  id: string | null,
): string | null {
  if (!id) return null;

  const byId = new Map(locations.map((l) => [l.id, l]));
  let current = byId.get(id);
  let guard = 0;

  while (current && guard < 10) {
    const name = current.contactName?.trim();
    if (name) return name;

    current = current.parentId ? byId.get(current.parentId) : undefined;
    guard += 1;
  }

  return null;
}

/**
 * Everything the item form needs per location: the indented label for the
 * dropdown, and the question this place wants asked about the exact spot.
 */
export function locationChoices(locations: LocationNode[]): Array<{
  id: string;
  label: string;
  detailLabel: string;
  detailHint: string;
  detailRequired: boolean;
  contactName: string | null;
}> {
  const byId = new Map(locations.map((l) => [l.id, l]));

  return locationOptions(locations).map((option) => {
    const guidance = detailGuidance(byId.get(option.id));

    return {
      id: option.id,
      label: option.label,
      detailLabel: guidance.label,
      detailHint: guidance.hint,
      detailRequired: guidance.required,
      contactName: contactFor(locations, option.id),
    };
  });
}
