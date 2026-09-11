import type { ToolStatus } from "@/generated/prisma/client";

/**
 * Works out a tool's stock status from its quantity.
 *
 * RETIRED is a deliberate human decision, so it is never overwritten by a
 * quantity change. Everything else follows the numbers, which keeps the
 * public search page honest without anyone having to remember to update it.
 */
export function deriveStatus(
  quantity: number,
  lowStockThreshold: number,
  currentStatus: ToolStatus,
): ToolStatus {
  if (currentStatus === "RETIRED") return "RETIRED";
  if (quantity <= 0) return "FINISHED";
  if (quantity <= lowStockThreshold) return "LOW_STOCK";
  return "AVAILABLE";
}

/** Renders a location as "Main Workshop > Shelf A" for display. */
export function locationPath(
  location: { name: string; parent?: { name: string } | null } | null,
): string {
  if (!location) return "Unassigned";
  if (!location.parent) return location.name;
  return `${location.parent.name} › ${location.name}`;
}
