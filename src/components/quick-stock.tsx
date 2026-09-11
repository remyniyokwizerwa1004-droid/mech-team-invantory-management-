"use client";

import { PackageMinus, RotateCcw } from "lucide-react";
import { useActionState } from "react";

import { Field, FormError, FormSuccess, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/actions/shared";
import { setRetired, updateQuantity } from "@/lib/actions/tools";

export function QuickStock({
  toolId,
  quantity,
  unit,
  retired,
}: {
  toolId: string;
  quantity: number;
  unit: string;
  retired: boolean;
}) {
  const [state, quantityAction] = useActionState<ActionState, FormData>(
    updateQuantity,
    {},
  );

  const [retireState, retireAction] = useActionState<ActionState, FormData>(
    setRetired,
    {},
  );

  return (
    <div className="space-y-4">
      <form action={quantityAction} className="space-y-3">
        <input type="hidden" name="toolId" value={toolId} />

        <FormError message={state.message} />
        <FormSuccess message={state.success} />

        <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Field
            label="New quantity"
            htmlFor="quantity"
            error={state.errors?.quantity}
          >
            <Input
              id="quantity"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={0}
              step={1}
              defaultValue={quantity}
              required
            />
          </Field>

          <Field label="Note (optional)" htmlFor="note">
            <Input
              id="note"
              name="note"
              placeholder="Used four on the cart 2 rebuild"
            />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SubmitButton size="sm" pendingLabel="Saving…">
            Update stock
          </SubmitButton>
          <span className="text-xs text-muted">
            Currently {quantity} {unit}. Status updates automatically.
          </span>
        </div>
      </form>

      <form
        action={retireAction}
        className="flex flex-wrap items-center gap-3 border-t border-line pt-4"
      >
        <input type="hidden" name="toolId" value={toolId} />
        <input type="hidden" name="retired" value={retired ? "false" : "true"} />

        <SubmitButton
          size="sm"
          variant={retired ? "secondary" : "danger"}
          pendingLabel="Updating…"
        >
          {retired ? (
            <>
              <RotateCcw className="size-3.5" aria-hidden />
              Return to service
            </>
          ) : (
            <>
              <PackageMinus className="size-3.5" aria-hidden />
              Retire this item
            </>
          )}
        </SubmitButton>

        <span className="text-xs text-muted">
          {retired
            ? "Retired items stay searchable with their full history."
            : "Use this when a tool is broken or replaced for good."}
        </span>

        <FormError message={retireState.message} />
        <FormSuccess message={retireState.success} />
      </form>
    </div>
  );
}
