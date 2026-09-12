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
    detailLabel: string | null;
    detailHint: string | null;
    detailRequired: boolean;
    contactName: string | null;
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

      <details className="rounded-lg border border-line bg-surface-sunken">
        <summary className="cursor-pointer list-none px-3 py-2 text-sm font-medium text-ink">
          What should people record about the exact spot here?
        </summary>

        <div className="space-y-3 border-t border-line px-3 py-3">
          <p className="text-sm text-body">
            Somewhere like a drawer unit needs a drawer number; an open
            warehouse floor needs a description. Set the question this place
            asks, and everyone adding an item here gets prompted for it.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Call that field"
              htmlFor={`detailLabel-${location?.id ?? "new"}`}
              hint="Leave blank for a plain “Exact spot”."
              error={state.errors?.detailLabel}
            >
              <Input
                id={`detailLabel-${location?.id ?? "new"}`}
                name="detailLabel"
                defaultValue={location?.detailLabel ?? ""}
                placeholder="Drawer number"
              />
            </Field>

            <Field
              label="Guidance under it"
              htmlFor={`detailHint-${location?.id ?? "new"}`}
              error={state.errors?.detailHint}
            >
              <Input
                id={`detailHint-${location?.id ?? "new"}`}
                name="detailHint"
                defaultValue={location?.detailHint ?? ""}
                placeholder="Which drawer, for example Locker 04"
              />
            </Field>

            <Field
              label="Who to ask"
              htmlFor={`contactName-${location?.id ?? "new"}`}
              hint="Shown to anyone looking for an item kept here."
              error={state.errors?.contactName}
              className="sm:col-span-2"
            >
              <Input
                id={`contactName-${location?.id ?? "new"}`}
                name="contactName"
                defaultValue={location?.contactName ?? ""}
                placeholder="Ask at the front desk"
              />
            </Field>
          </div>

          <label className="flex items-start gap-3 rounded-lg border border-line bg-surface p-3">
            <input
              type="checkbox"
              name="detailRequired"
              defaultChecked={location?.detailRequired}
              className="mt-0.5 size-4 rounded border-line-strong text-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Make it compulsory
              </span>
              <span className="block text-sm text-muted">
                Nobody can save an item here without saying exactly where it
                sits.
              </span>
            </span>
          </label>
        </div>
      </details>

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
