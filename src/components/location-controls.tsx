"use client";

import { Trash2 } from "lucide-react";
import { useActionState } from "react";

import { Field, FormError, FormSuccess, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteLocation, saveLocation } from "@/lib/actions/locations";
import type { ActionState } from "@/lib/actions/shared";

export type LocationOption = { id: string; label: string };

export function LocationForm({
  location,
  parents,
  submitLabel,
}: {
  location?: {
    id: string;
    name: string;
    code: string | null;
    description: string | null;
    parentId: string | null;
  };
  parents: LocationOption[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveLocation,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      {location ? <input type="hidden" name="id" value={location.id} /> : null}

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label="Name"
          htmlFor={`name-${location?.id ?? "new"}`}
          required
          error={state.errors?.name}
        >
          <Input
            id={`name-${location?.id ?? "new"}`}
            name="name"
            defaultValue={location?.name}
            placeholder="Shelf 3"
            required
          />
        </Field>

        <Field
          label="Code"
          htmlFor={`code-${location?.id ?? "new"}`}
          hint="Optional short label, like SR-3."
          error={state.errors?.code}
        >
          <Input
            id={`code-${location?.id ?? "new"}`}
            name="code"
            defaultValue={location?.code ?? ""}
            placeholder="SR-3"
          />
        </Field>

        <Field
          label="Inside"
          htmlFor={`parentId-${location?.id ?? "new"}`}
          hint="Leave blank for a room or top-level area."
          error={state.errors?.parentId}
        >
          <Select
            id={`parentId-${location?.id ?? "new"}`}
            name="parentId"
            defaultValue={location?.parentId ?? ""}
          >
            <option value="">Top level</option>
            {parents
              .filter((parent) => parent.id !== location?.id)
              .map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
          </Select>
        </Field>

        <Field
          label="Description"
          htmlFor={`description-${location?.id ?? "new"}`}
          error={state.errors?.description}
        >
          <Input
            id={`description-${location?.id ?? "new"}`}
            name="description"
            defaultValue={location?.description ?? ""}
            placeholder="Behind the workbench"
          />
        </Field>
      </div>

      <SubmitButton size="sm" pendingLabel="Saving…">
        {submitLabel}
      </SubmitButton>
    </form>
  );
}

export function DeleteLocationButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteLocation,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="id" value={id} />

      <FormError message={state.message} />

      <SubmitButton size="sm" variant="danger" pendingLabel="Removing…">
        <Trash2 className="size-3.5" aria-hidden />
        Remove {name}
      </SubmitButton>
    </form>
  );
}
