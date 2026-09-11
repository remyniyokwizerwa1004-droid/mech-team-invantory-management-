import Link from "next/link";
import { LogOut, Wrench } from "lucide-react";

import { NavLink } from "@/components/nav-link";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { ROLE_LABELS } from "@/lib/permissions";

export async function SiteHeader() {
  const user = await getCurrentUser();

  // So a fault nobody has picked up is visible from every page, to everyone
  // on the team, without them having to go looking for it.
  const unattended = user
    ? await prisma.repairTicket.count({
        where: { status: "OPEN", assignedToId: null },
      })
    : 0;

  const links: Array<{
    href: string;
    label: string;
    count?: number;
    countLabel?: string;
  }> = [{ href: "/", label: "Inventory" }];

  if (user) {
    if (can(user.role, "dashboard:view")) {
      links.push({ href: "/dashboard", label: "Dashboard" });
    }

    links.push({ href: "/requisitions", label: "Requests" });
    links.push({
      href: "/tickets",
      label: "Maintenance",
      count: unattended,
      countLabel: "with nobody on them",
    });

    if (can(user.role, "location:write")) {
      links.push({ href: "/locations", label: "Locations" });
    }

    if (can(user.role, "user:manage")) {
      links.push({ href: "/admin/users", label: "Team" });
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-brand text-white">
              <Wrench className="size-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm leading-tight font-semibold text-ink">
                Mechanical Team Inventory
              </span>
              <span className="hidden text-xs leading-tight text-muted sm:block">
                Tools, materials and repairs
              </span>
            </span>
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm leading-tight font-medium text-ink">
                  {user.name}
                </p>
                <p className="text-xs leading-tight text-muted">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>

              <Badge tone="info" className="sm:hidden">
                {user.name.split(" ")[0]}
              </Badge>

              <form action={logout}>
                <button
                  type="submit"
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  <LogOut className="size-3.5" aria-hidden />
                  <span className="hidden sm:inline">Sign out</span>
                </button>
              </form>
            </div>
          ) : (
            <Link
              href="/login"
              className={buttonClasses({ variant: "primary", size: "sm" })}
            >
              Sign in
            </Link>
          )}
        </div>

        {/* Scrolls sideways on a phone rather than collapsing behind a menu. */}
        <nav
          aria-label="Main"
          className="-mx-4 flex gap-5 overflow-x-auto border-t border-line px-4 sm:mx-0 sm:px-0"
        >
          {links.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>
    </header>
  );
}
