"use client";

import { PackagePlus } from "lucide-react";
import { useActionState, useState } from "react";

import { LocationPicker, type LocationChoice } from "@/components/location-picker";

import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { RequestStatus, Urgency } from "@/generated/prisma/client";
import { createRequest, decideRequest } from "@/lib/actions/requisitions";
import type { ActionState } from "@/lib/actions/shared";
import { REQUEST_STATUS_LABELS, URGENCY_LABELS } from "@/lib/display";

const URGENCIES: Urgency[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

export type RequestToolOption = {
  id: string;
  name: string;
  unit: string;
};

export function NewRequestForm({
  tools,
  defaultToolId,
}: {
  tools: RequestToolOption[];
  defaultToolId: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createRequest,
    {},
  );

  const [toolId, setToolId] = useState(defaultToolId);
  const selected = tools.find((tool) => tool.id === toolId);

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.message} />

      <Field
        label="Which item"
        htmlFor="toolId"
        hint="Leave as 'Something not in inventory' if the team has never stocked it."
        error={state.errors?.toolId}
      >
        <Select
          id="toolId"
          name="toolId"
          value={toolId}
          onChange={(event) => setToolId(event.target.value)}
        >
          <option value="">Something not in inventory yet</option>
          {tools.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Item name"
        htmlFor="itemName"
        required
        hint="What to put on the order."
        error={state.errors?.itemName}
      >
        <Input
          id="itemName"
          name="itemName"
          // Keyed so picking a different tool refills this field.
          key={toolId}
          defaultValue={selected?.name ?? ""}
          placeholder="Solder wire 0.8 mm lead-free"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="How many"
          htmlFor="quantityRequested"
          required
          error={state.errors?.quantityRequested}
        >
          <Input
            id="quantityRequested"
            name="quantityRequested"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            defaultValue={1}
            required
          />
        </Field>

        <Field label="Unit" htmlFor="unit" required error={state.errors?.unit}>
          <Input
            id="unit"
            name="unit"
            key={`unit-${toolId}`}
            defaultValue={selected?.unit ?? "pcs"}
            required
          />
        </Field>

        <Field
          label="Urgency"
          htmlFor="urgency"
          required
          error={state.errors?.urgency}
        >
          <Select id="urgency" name="urgency" defaultValue="NORMAL">
            {URGENCIES.map((urgency) => (
              <option key={urgency} value={urgency}>
                {URGENCY_LABELS[urgency]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Why it is needed"
        htmlFor="reason"
        hint="A line of context makes approval much faster."
        error={state.errors?.reason}
      >
        <Textarea
          id="reason"
          name="reason"
          rows={3}
          placeholder="Completely out. Two rewiring jobs are blocked."
        />
      </Field>

      <SubmitButton pendingLabel="Submitting…">Submit request</SubmitButton>
    </form>
  );
}

const OUTCOME_STYLE: Partial<
  Record<RequestStatus, "primary" | "secondary" | "danger">
> = {
  APPROVED: "primary",
  ORDERED: "primary",
  RECEIVED: "primary",
  REJECTED: "danger",
};

export function RequestDecisionPanel({
  requestId,
  status,
  options,
  linkedToolName,
  itemName,
  quantityLabel,
  approverName,
  categories,
  locations,
}: {
  requestId: string;
  status: RequestStatus;
  options: RequestStatus[];
  linkedToolName: string | null;
  itemName: string;
  /** For example "5 rolls". */
  quantityLabel: string;
  /** Who approved it, and so who to ask while the new item has no location. */
  approverName: string;
  categories: string[];
  locations: LocationChoice[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    decideRequest,
    {},
  );

  if (options.length === 0) {
    // Keep the confirmation of the step just taken on screen: once a request
    // is received the panel has nothing left to offer, and the message is
    // where it says what happened to the stock and who to ask.
    return (
      <div className="space-y-3">
        <FormSuccess message={state.success} />
        <p className="text-sm text-muted">
          This request is {REQUEST_STATUS_LABELS[status].toLowerCase()}. There is
          nothing further to decide.
        </p>
      </div>
    );
  }

  const canReceive = options.includes("RECEIVED");

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="requestId" value={requestId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field
        label="Note (optional)"
        htmlFor={`note-${requestId}`}
        hint="Recorded against this step in the history."
      >
        <Textarea
          id={`note-${requestId}`}
          name="note"
          rows={2}
          placeholder="PO 2291 raised. Expected within the week."
        />
      </Field>

      {canReceive && !linkedToolName ? (
        <fieldset className="space-y-4 rounded-lg border border-brand-line bg-brand-soft/40 p-4">
          {/* A native legend sits on the border line; keep it for screen
              readers and show an ordinary heading inside the box instead. */}
          <legend className="sr-only">Details for the new item</legend>
          <p className="flex items-start gap-2 text-sm font-semibold text-ink">
            <PackagePlus className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
            When it arrives, it goes into the inventory
          </p>

          <p className="text-sm text-body">
            Marking this received adds <span className="font-medium text-ink">{quantityLabel} of {itemName}</span>{" "}
            to live stock straight away. Everything below can be changed later
            on the item itself.
          </p>

          <div className="grid gap-4">
            <Field
              label="Category"
              htmlFor={`receiveCategory-${requestId}`}
              hint="Pick one or type a new one. Left empty, it is filed as Uncategorised."
              error={state.errors?.receiveCategory}
            >
              <Input
                id={`receiveCategory-${requestId}`}
                name="receiveCategory"
                list={`receive-categories-${requestId}`}
                placeholder="Hand Tools"
              />
              <datalist id={`receive-categories-${requestId}`}>
                {categories.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </Field>

            <Field
              label="Low-stock level"
              htmlFor={`receiveLowStock-${requestId}`}
              hint="At or below this, it shows as low stock."
              error={state.errors?.receiveLowStock}
            >
              <Input
                id={`receiveLowStock-${requestId}`}
                name="receiveLowStock"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                defaultValue={1}
              />
            </Field>
          </div>

          <LocationPicker
            locations={locations}
            errors={{
              storageLocationId: state.errors?.storageLocationId,
              locationDetail: state.errors?.locationDetail,
            }}
            unplacedNote={
              <>
                You can give it a location later. Until then, anyone looking for
                it is told to ask <strong>{approverName}</strong>, who approved
                this request.
              </>
            }
          />
        </fieldset>
      ) : null}

      {canReceive && linkedToolName ? (
        <label className="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-3">
          <input
            type="checkbox"
            name="addToStock"
            defaultChecked
            className="mt-0.5 size-4 rounded border-line-strong text-brand"
          />
          <span className="text-sm text-body">
            Add the received quantity to{" "}
            <span className="font-medium text-ink">{linkedToolName}</span> in the
            inventory, and record it in that item&apos;s history.
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <SubmitButton
            key={option}
            name="status"
            value={option}
            size="sm"
            variant={OUTCOME_STYLE[option] ?? "secondary"}
            pendingLabel="Saving…"
          >
            Mark {REQUEST_STATUS_LABELS[option].toLowerCase()}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}
