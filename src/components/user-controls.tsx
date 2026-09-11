"use client";

import { KeyRound, UserCheck, UserX } from "lucide-react";
import { useActionState } from "react";

import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { UserRole } from "@/generated/prisma/client";
import { createUser, resetPassword, setUserActive, updateUserRole } from "@/lib/actions/users";
import type { ActionState } from "@/lib/actions/shared";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";

const ROLES: UserRole[] = ["TEAMMATE", "INVENTORY_MANAGER", "SUPER_ADMIN"];

export function CreateUserForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createUser,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" htmlFor="new-name" required error={state.errors?.name}>
          <Input id="new-name" name="name" placeholder="Grace Uwase" required />
        </Field>

        <Field
          label="Email"
          htmlFor="new-email"
          required
          error={state.errors?.email}
        >
          <Input
            id="new-email"
            name="email"
            type="email"
            placeholder="grace@mechteam.local"
            required
          />
        </Field>

        <Field label="Role" htmlFor="new-role" required error={state.errors?.role}>
          <Select id="new-role" name="role" defaultValue="TEAMMATE">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Temporary password"
          htmlFor="new-password"
          required
          hint="At least 8 characters, with a letter and a number."
          error={state.errors?.password}
        >
          <Input
            id="new-password"
            name="password"
            type="text"
            autoComplete="off"
            placeholder="Share it privately"
            required
          />
        </Field>
      </div>

      <SubmitButton size="sm" pendingLabel="Creating…">
        Create account
      </SubmitButton>
    </form>
  );
}

export function RoleControl({
  userId,
  role,
}: {
  userId: string;
  role: UserRole;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateUserRole,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field label="Role" htmlFor={`role-${userId}`}>
        <Select id={`role-${userId}`} name="role" defaultValue={role}>
          {ROLES.map((option) => (
            <option key={option} value={option}>
              {ROLE_LABELS[option]}
            </option>
          ))}
        </Select>
      </Field>

      <p className="text-xs text-muted">{ROLE_DESCRIPTIONS[role]}</p>

      <SubmitButton size="sm" variant="secondary" pendingLabel="Updating…">
        Update role
      </SubmitButton>
    </form>
  );
}

export function ActiveControl({
  userId,
  isActive,
  name,
}: {
  userId: string;
  isActive: boolean;
  name: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    setUserActive,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="isActive" value={isActive ? "false" : "true"} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <SubmitButton
        size="sm"
        variant={isActive ? "danger" : "secondary"}
        pendingLabel="Saving…"
      >
        {isActive ? (
          <>
            <UserX className="size-3.5" aria-hidden />
            Disable {name.split(" ")[0]}
          </>
        ) : (
          <>
            <UserCheck className="size-3.5" aria-hidden />
            Re-enable {name.split(" ")[0]}
          </>
        )}
      </SubmitButton>

      <p className="text-xs text-muted">
        {isActive
          ? "Disabling signs them out immediately and blocks any further changes."
          : "Their history stays intact and reappears against their name."}
      </p>
    </form>
  );
}

export function PasswordControl({ userId }: { userId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    resetPassword,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field
        label="Set a new password"
        htmlFor={`password-${userId}`}
        hint="At least 8 characters, with a letter and a number."
        error={state.errors?.password}
      >
        <Input
          id={`password-${userId}`}
          name="password"
          type="text"
          autoComplete="off"
          placeholder="Share it privately"
        />
      </Field>

      <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
        <KeyRound className="size-3.5" aria-hidden />
        Reset password
      </SubmitButton>
    </form>
  );
}
