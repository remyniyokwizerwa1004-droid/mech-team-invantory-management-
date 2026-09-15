"use client";

import Link from "next/link";
import { useActionState } from "react";

import { LocationPicker, type LocationChoice } from "@/components/location-picker";
import { PhotoField } from "@/components/photo-field";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, FormError, Input, Textarea } from "@/components/ui/form";
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

export function ToolForm({
  tool,
  categories,
  locations,
  photoUrl = null,
  askName,
}: {
  tool?: ToolFormValues;
  categories: string[];
  locations: LocationChoice[];
  /** The stored photo, when editing an item that has one. */
  photoUrl?: string | null;
  /** Who people are told to ask while the item has no location. */
  askName: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    saveTool,
    {},
  );

  const isEditing = Boolean(tool?.id);

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

      {/* Anchored so "Add a photo" on an item page can jump straight here. */}
      <section id="photo" className="scroll-mt-24">
        <Card>
          <CardHeader
            title="Photo"
            description="Shown to everyone searching the inventory, so they can recognise the right item."
          />
          <CardBody>
            <PhotoField existingPhotoUrl={photoUrl} error={state.errors?.photo} />
          </CardBody>
        </Card>
      </section>

      <Card>
        <CardHeader
          title="Where it lives"
          description="Everyone sees this, including people searching without an account. Be specific enough that someone can walk up and take it."
        />

        <CardBody>
          <LocationPicker
            locations={locations}
            defaultLocationId={tool?.storageLocationId}
            defaultDetail={tool?.locationDetail}
            errors={{
              storageLocationId: state.errors?.storageLocationId,
              locationDetail: state.errors?.locationDetail,
            }}
            unplacedNote={
              <>
                Fine to leave for now. Until it has a location, anyone looking
                for it is told to ask <strong>{askName}</strong>.
              </>
            }
          />
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
