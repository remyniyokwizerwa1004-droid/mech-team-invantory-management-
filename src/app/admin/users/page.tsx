import type { Metadata } from "next";
import { ChevronDown, Users } from "lucide-react";

import { RoleBadge } from "@/components/domain-badges";
import {
  ActiveControl,
  CreateUserForm,
  PasswordControl,
  RoleControl,
} from "@/components/user-controls";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/display";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const actor = await requirePermission("user:manage", "/admin/users");

  const users = await prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: { requestsMade: true, ticketsOpened: true },
      },
    },
  });

  const activeCount = users.filter((user) => user.isActive).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Team accounts"
        description="Who can sign in and what each person is allowed to change. Only super admins see this page."
      />

      <Card>
        <CardHeader
          title="Add someone to the team"
          description="They sign in with the email and password you set here."
        />
        <CardBody>
          <CreateUserForm />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={`${users.length} ${users.length === 1 ? "account" : "accounts"}`}
          description={`${activeCount} active. Open a row to change a role, reset a password or disable access.`}
        />

        {users.length === 0 ? (
          <EmptyState icon={Users} title="No accounts yet" />
        ) : (
          <ul className="divide-y divide-line">
            {users.map((user) => (
              <li key={user.id}>
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 transition-colors hover:bg-surface-sunken">
                    <ChevronDown
                      className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
                      aria-hidden
                    />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {user.name}
                        {user.id === actor.id ? (
                          <span className="ml-2 text-xs font-normal text-muted">
                            you
                          </span>
                        ) : null}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {user.email}
                      </span>
                    </span>

                    <span className="flex shrink-0 items-center gap-1.5">
                      {user.isActive ? null : (
                        <Badge tone="critical">Disabled</Badge>
                      )}
                      <RoleBadge role={user.role} />
                    </span>
                  </summary>

                  <div className="grid gap-6 border-t border-line bg-surface-sunken px-5 py-4 sm:grid-cols-2">
                    <RoleControl userId={user.id} role={user.role} />

                    <div className="space-y-6">
                      <PasswordControl userId={user.id} />

                      {user.id === actor.id ? (
                        <p className="text-xs text-muted">
                          You cannot disable your own account.
                        </p>
                      ) : (
                        <ActiveControl
                          userId={user.id}
                          isActive={user.isActive}
                          name={user.name}
                        />
                      )}
                    </div>

                    <p className="text-xs text-muted sm:col-span-2">
                      Joined {formatDate(user.createdAt)} ·{" "}
                      {user._count.requestsMade} requests raised ·{" "}
                      {user._count.ticketsOpened} faults reported
                    </p>
                  </div>
                </details>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
