import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";

import { LoginForm } from "@/app/login/login-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

function first(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

export default async function LoginPage(props: PageProps<"/login">) {
  const user = await getCurrentUser();
  if (user) redirect("/");

  const requested = first((await props.searchParams).next);
  const next =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  return (
    <div className="mx-auto w-full max-w-sm py-6">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-dark"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to the inventory
      </Link>

      <Card className="p-6">
        <div className="mb-5 text-center">
          <span className="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-brand-soft text-brand">
            <Lock className="size-4" aria-hidden />
          </span>
          <h1 className="text-lg font-semibold text-ink">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Only needed to change stock, raise a request or open a ticket.
          </p>
        </div>

        <LoginForm next={next} />
      </Card>

      {process.env.NODE_ENV !== "production" ? (
        <div className="mt-5 rounded-card border border-line bg-surface-sunken p-4">
          <p className="text-xs font-semibold text-ink">
            Demo accounts (development only)
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs text-body">
            <li>admin@mechteam.local · ChangeMe123!</li>
            <li>manager@mechteam.local · ChangeMe123!</li>
            <li>tech@mechteam.local · ChangeMe123!</li>
          </ul>
          <p className="mt-2 text-xs text-muted">
            This panel is hidden in production. Change these passwords before
            deploying.
          </p>
        </div>
      ) : null}
    </div>
  );
}
