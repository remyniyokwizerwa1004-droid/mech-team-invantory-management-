"use client";

import { MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/actions/shared";
import { saveTool } from "@/lib/actions/tools";

export type ToolFormValues = {
  id?: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lowStockThreshold: number;
  storageLocationId: string;
  locationDetail: string;
  notes: string;
  retired: boolean;
};

/** A location plus the question it wants asked about the exact spot. */
export type LocationChoice = {
  id: string;
  label: string;
  detailLabel: string;
  detailHint: string;
  detailRequired: boolean;
  contactName: string | null;
};

export function ToolForm({
  tool,
  categories,
  locations,
}: {
  tool?: ToolFormValues;
  categories: string[];
  locations: LocationChoice[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveTool,
    {},
  );

  const isEditing = Boolean(tool?.id);

  // The exact-spot question changes with the place chosen: a drawer unit asks
  // for a drawer number, a warehouse floor asks for a description. Tracking
  // the selection in state lets the field relabel itself as you choose.
  const [locationId, setLocationId] = useState(tool?.storageLocationId ?? "");
  const selected = locations.find((location) => location.id === locationId);

  return (
    <form action={formAction} className="space-y-5">
      {tool?.id ? <input type="hidden" name="id" value={tool.id} /> : null}

      <FormError message={state.message} />

      <Card>
        <CardHeader
          title="What it is"
          description="How the item appears in search results."
        />

        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Name"
            htmlFor="name"
            required
            error={state.errors?.name}
            className="sm:col-span-2"
          >
            <Input
              id="name"
              name="name"
              defaultValue={tool?.name}
              placeholder="Torque wrench (2–24 Nm)"
              required
            />
          </Field>

          <Field
            label="Category"
            htmlFor="category"
            required
            hint="Pick an existing one or type a new one."
            error={state.errors?.category}
          >
            <Input
              id="category"
              name="category"
              list="tool-categories"
              defaultValue={tool?.category}
              placeholder="Hand Tools"
              required
            />
            <datalist id="tool-categories">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Notes"
            htmlFor="notes"
            hint="Anything the next person should know. Shown publicly."
            error={state.errors?.notes}
            className="sm:col-span-2"
          >
            <Textarea
              id="notes"
              name="notes"
              rows={3}
              defaultValue={tool?.notes}
              placeholder="Calibration due every 12 months."
            />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Where it lives"
          description="Everyone sees this, including people searching without an account. Be specific enough that someone can walk up and take it."
        />

        <CardBody className="space-y-4">
          <Field
            label="Storage location"
            htmlFor="storageLocationId"
            required
            hint="The building or area to go to."
            error={state.errors?.storageLocationId}
          >
            <Select
              id="storageLocationId"
              name="storageLocationId"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
            >
              <option value="">Not assigned yet</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label={selected ? selected.detailLabel : "Exact spot"}
            htmlFor="locationDetail"
            required={selected?.detailRequired ?? false}
            hint={
              selected
                ? selected.detailHint
                : "Choose a storage location first and this will ask for the right detail."
            }
            error={state.errors?.locationDetail}
          >
            <Input
              id="locationDetail"
              name="locationDetail"
              defaultValue={tool?.locationDetail}
              placeholder={selected ? selected.detailHint : ""}
            />
          </Field>

          {selected?.contactName ? (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken p-3 text-sm text-body">
              <UserRound className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              <span>
                Anyone looking for this will be told to ask{" "}
                <span className="font-medium text-ink">
                  {selected.contactName}
                </span>
                , who looks after this location. Change it under Locations.
              </span>
            </p>
          ) : null}

          {!selected ? (
            <p className="flex items-start gap-2 rounded-lg border border-line bg-surface-sunken p-3 text-sm text-muted">
              <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                An item with no location still appears in search, but nobody
                will know where to find it.
              </span>
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="How much there is"
          description="Status is worked out from these numbers, so the public page is never out of date."
        />

        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Quantity"
            htmlFor="quantity"
            required
            error={state.errors?.quantity}
          >
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={tool?.quantity ?? 0}
              required
            />
          </Field>

          <Field
            label="Unit"
            htmlFor="unit"
            required
            hint="pcs, sets, rolls…"
            error={state.errors?.unit}
          >
            <Input
              id="unit"
              name="unit"
              defaultValue={tool?.unit ?? "pcs"}
              required
            />
          </Field>

          <Field
            label="Low-stock level"
            htmlFor="lowStockThreshold"
            required
            hint="At or below this, it shows as low stock."
            error={state.errors?.lowStockThreshold}
          >
            <Input
              id="lowStockThreshold"
              name="lowStockThreshold"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={tool?.lowStockThreshold ?? 1}
              required
            />
          </Field>

          <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-3 sm:col-span-3">
            <input
              type="checkbox"
              name="retired"
              defaultChecked={tool?.retired}
              className="mt-0.5 size-4 rounded border-line-strong text-brand"
            />
            <span>
              <span className="block text-sm font-medium text-ink">
                Retired from service
              </span>
              <span className="block text-sm text-muted">
                Keeps the item and its history searchable, but marks it as no
                longer in use. Quantity stops driving its status.
              </span>
            </span>
          </label>
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="Saving…">
          {isEditing ? "Save changes" : "Add to inventory"}
        </SubmitButton>

        <Link
          href={tool?.id ? `/tools/${tool.id}` : "/"}
          className={buttonClasses({ variant: "secondary" })}
        >
          Cancel
        </Link>

        <p className="text-sm text-muted">
          Every change is recorded against your name.
        </p>
      </div>
    </form>
  );
}
