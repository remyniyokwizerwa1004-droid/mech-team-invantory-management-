"use client";

import { useActionState } from "react";

import { Field, FormError, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { login } from "@/lib/actions/auth";
import type { ActionState } from "@/lib/actions/shared";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    login,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <FormError message={state.message} />

      <Field
        label="Email"
        htmlFor="email"
        required
        error={state.errors?.email}
      >
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          placeholder="you@mechteam.local"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        required
        error={state.errors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}
