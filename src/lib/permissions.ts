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

  // Runs the inventory end to end: stock, storage locations, requests,
  // maintenance and reporting. The single thing withheld is deciding who has
  // an account and what role they hold, which stays with a super admin.
  INVENTORY_MANAGER: PERMISSIONS.filter(
    (permission) => permission !== "user:manage",
  ),
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super admin",
  INVENTORY_MANAGER: "Inventory manager",
};

export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SUPER_ADMIN:
    "Everything, including adding people to the team and choosing their role.",
  INVENTORY_MANAGER:
    "Everything to do with the inventory: stock, storage locations, requests, maintenance and reports. Cannot add people or change roles.",
};
