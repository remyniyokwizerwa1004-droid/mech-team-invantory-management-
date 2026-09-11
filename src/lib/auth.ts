import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import type { UserRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import { readSession } from "@/lib/session";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
};

/**
 * The single place the app answers "who is making this request?".
 *
 * It re-reads the user from the database rather than trusting the cookie's
 * copy of the role, so demoting or disabling someone takes effect on their
 * very next request instead of whenever their cookie happens to expire.
 *
 * React's cache() keeps that to one query per request, no matter how many
 * components ask.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role };
});

/** Thrown by server actions when the caller may not do what they asked. */
export class AuthorizationError extends Error {
  constructor(message = "You are not allowed to do that.") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Guard for server actions. Every write in this app starts with a call to
 * this, so hiding a button in the UI is a convenience, never the control.
 */
export async function assertPermission(
  permission: Permission,
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    throw new AuthorizationError("Please sign in to do that.");
  }

  if (!can(user.role, permission)) {
    throw new AuthorizationError(
      "Your role does not allow that action. Ask a super admin if you need access.",
    );
  }

  return user;
}

/** Guard for pages. Sends anyone without a session to the login screen. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect(returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : "/login");
  }

  return user;
}

/** Guard for pages that a role must not even open. */
export async function requirePermission(
  permission: Permission,
  returnTo?: string,
): Promise<CurrentUser> {
  const user = await requireUser(returnTo);

  if (!can(user.role, permission)) {
    redirect("/no-access");
  }

  return user;
}
