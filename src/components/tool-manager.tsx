"use client";

import { Search, Sparkles, Trash2, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";

import { ToolStatusBadge } from "@/components/domain-badges";
import { Badge } from "@/components/ui/badge";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FormError, FormSuccess } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ToolStatus } from "@/generated/prisma/client";
import { deleteTools, removeSampleData } from "@/lib/actions/tools";
import type { ActionState } from "@/lib/actions/shared";
import { cn } from "@/lib/utils";

export type ManagedTool = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  status: ToolStatus;
  location: string;
  isSample: boolean;
};

/** The one-click clear-out, shown only while example data is still present. */
export function SampleDataCard({ sampleCount }: { sampleCount: number }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    removeSampleData,
    {},
  );

  if (sampleCount === 0 && !state.success) return null;

  return (
    <Card className="border-brand-line">
      <CardBody>
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Sparkles className="size-4" aria-hidden />
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">
              Clear the example data
            </p>
            <p className="mt-1 text-sm text-body">
              The app shipped with {sampleCount} example items, plus the
              requests and maintenance jobs attached to them, so every screen had
              something to show. Removing them leaves your storage locations
              and team accounts alone, so you can start adding real stock right
              away.
            </p>

            {sampleCount > 0 ? (
              <form action={formAction} className="mt-3">
                <SubmitButton size="sm" variant="danger" pendingLabel="Removing…">
                  <Trash2 className="size-3.5" aria-hidden />
                  Remove all {sampleCount} sample items
                </SubmitButton>
              </form>
            ) : null}

            <div className="mt-2 space-y-2">
              <FormError message={state.message} />
              <FormSuccess message={state.success} />
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

/**
 * Tick boxes plus a two-step delete. Selection is kept in state and submitted
 * as hidden inputs, so it survives while the person works down the page.
 */
export function ToolManager({ tools }: { tools: ManagedTool[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    deleteTools,
    {},
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  // Once a delete has gone through, whatever was ticked no longer exists.
  // Adjusted during render rather than in an effect, which is React's
  // recommended way to reset state in response to new props.
  const [handled, setHandled] = useState(state);

  if (state !== handled) {
    setHandled(state);

    if (state.success) {
      setSelected(new Set());
      setConfirming(false);
    }
  }

  const pageIds = tools.map((tool) => tool.id);
  const allSelected =
    pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  function toggle(id: string) {
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      for (const id of pageIds) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }
      return next;
    });
  }

  return (
    <form action={formAction}>
      {[...selected].map((id) => (
        <input key={id} type="hidden" name="toolIds" value={id} />
      ))}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface-sunken px-4 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={pageIds.length === 0}
            className="size-4 rounded border-line-strong text-brand"
          />
          Select all on this page
        </label>

        <span className="tabular text-sm text-muted">
          {selected.size} selected
        </span>

        {selected.size > 0 ? (
          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
              setConfirming(false);
            }}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:text-brand-dark"
          >
            <X className="size-3.5" aria-hidden />
            Clear
          </button>
        ) : null}

        <span className="ml-auto">
          {confirming ? (
            <SubmitButton size="sm" variant="danger" pendingLabel="Removing…">
              <Trash2 className="size-3.5" aria-hidden />
              Yes, remove {selected.size}
            </SubmitButton>
          ) : (
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => setConfirming(true)}
              className={buttonClasses({ variant: "danger", size: "sm" })}
            >
              <Trash2 className="size-3.5" aria-hidden />
              Remove selected
            </button>
          )}
        </span>
      </div>

      {confirming ? (
        <p className="flex items-start gap-2 border-b border-line bg-critical-soft px-4 py-2.5 text-sm text-critical">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          This removes {selected.size} {selected.size === 1 ? "item" : "items"}{" "}
          for good, along with their history and any maintenance jobs raised
          against them. It cannot be undone.
        </p>
      ) : null}

      {state.message || state.success ? (
        <div className="space-y-2 px-4 pt-3">
          <FormError message={state.message} />
          <FormSuccess message={state.success} />
        </div>
      ) : null}

      {tools.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nothing here"
          description="Try another filter, or add your first item."
        />
      ) : (
        <ul className="divide-y divide-line">
          {tools.map((tool) => (
            <li key={tool.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors",
                  selected.has(tool.id)
                    ? "bg-brand-soft"
                    : "hover:bg-surface-sunken",
                )}
              >
                <input
                  type="checkbox"
                  checked={selected.has(tool.id)}
                  onChange={() => toggle(tool.id)}
                  className="size-4 shrink-0 rounded border-line-strong text-brand"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-ink">
                      {tool.name}
                    </span>
                    {tool.isSample ? <Badge tone="neutral">Sample</Badge> : null}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted">
                    {tool.category} · {tool.location}
                  </span>
                </span>

                <span className="tabular hidden shrink-0 text-sm text-body sm:block">
                  {tool.quantity} {tool.unit}
                </span>

                <ToolStatusBadge status={tool.status} />

                <Link
                  href={`/tools/${tool.id}/edit`}
                  className="shrink-0 text-sm font-medium text-brand hover:text-brand-dark"
                >
                  Edit
                </Link>
              </label>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
