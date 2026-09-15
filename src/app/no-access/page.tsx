import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PhotoBackdrop } from "@/components/ui/photo-backdrop";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

export const metadata: Metadata = { title: "No access" };
export const dynamic = "force-dynamic";

export default async function NoAccessPage() {
  const user = await getCurrentUser();

  return (
    <div className="relative isolate -my-8 flex min-h-[calc(100svh-9.5rem)] flex-col justify-center py-12">
      <PhotoBackdrop />

      <div className="mx-auto w-full max-w-md">
        <Card className="p-6 text-center">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-warning-soft text-warning">
            <ShieldAlert className="size-5" aria-hidden />
          </span>

          <h1 className="text-lg font-semibold text-ink">
            That page is not open to your role
          </h1>

          {user ? (
            <p className="mt-2 text-sm text-body">
              You are signed in as {user.name}, a{" "}
              {ROLE_LABELS[user.role].toLowerCase()}.{" "}
              {ROLE_DESCRIPTIONS[user.role]} Ask a super admin if you need more
              access.
            </p>
          ) : (
            <p className="mt-2 text-sm text-body">
              Sign in with an account that has permission for this page.
            </p>
          )}

          <div className="mt-5 flex justify-center gap-2">
            <Link href="/" className={buttonClasses({ variant: "secondary" })}>
              Back to inventory
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
