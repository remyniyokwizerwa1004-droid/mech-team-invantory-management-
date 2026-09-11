import type { UserRole } from "@/generated/prisma/client";

/**
 * Every distinct thing a signed-in person can do. Code always asks for a
 * permission, never for a role, so adding a fourth role later means adding one
 * row to ROLE_PERMISSIONS below and changing nothing else.
 */
export const PERMISSIONS = [
  "tool:write",
  "tool:delete",
  "location:write",
  "dashboard:view",
  "requisition:create",
  "requisition:decide",
  "ticket:create",
  "ticket:manage",
  "user:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSIONS,

  // Runs the stock day to day. Storage locations are deliberately not theirs:
  // the shape of the workshop is a super admin decision, because moving or
  // deleting a location affects every item filed under it.
  INVENTORY_MANAGER: [
    "tool:write",
    "tool:delete",
    "dashboard:view",
    "requisition:create",
    "requisition:decide",
    "ticket:create",
    "ticket:manage",
  ],

  // Teammates see everything the public sees, and can raise requests and open
  // tickets. They cannot change stock, decide on requests, or see the
  // management dashboard.
  TEAMMATE: ["requisition:create", "ticket:create"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super admin",
  INVENTORY_MANAGER: "Inventory manager",
  TEAMMATE: "Teammate",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN:
    "Full access, including storage locations, team accounts and roles.",
  INVENTORY_MANAGER:
    "Manages stock, requests and repair tickets. Cannot add or remove storage locations, or manage accounts.",
  TEAMMATE:
    "Can search stock, follow repair tickets, raise requests and report faults.",
};
