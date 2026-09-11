"use client";

import { MessageSquarePlus } from "lucide-react";
import { useActionState } from "react";

import { Field, FormError, FormSuccess, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TicketSeverity, TicketStatus } from "@/generated/prisma/client";
import {
  addTicketNote,
  assignTicket,
  createTicket,
  updateTicketStatus,
} from "@/lib/actions/tickets";
import type { ActionState } from "@/lib/actions/shared";
import { SEVERITY_LABELS, TICKET_STATUS_LABELS } from "@/lib/display";

const SEVERITIES: TicketSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function NewTicketForm({
  tools,
  defaultToolId,
}: {
  tools: Array<{ id: string; name: string }>;
  defaultToolId: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    createTicket,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <FormError message={state.message} />

      <Field
        label="Which tool"
        htmlFor="toolId"
        required
        error={state.errors?.toolId}
      >
        <Select id="toolId" name="toolId" defaultValue={defaultToolId} required>
          <option value="">Choose the tool or equipment</option>
          {tools.map((tool) => (
            <option key={tool.id} value={tool.id}>
              {tool.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Summary"
        htmlFor="title"
        required
        hint="A short line that says what is wrong."
        error={state.errors?.title}
      >
        <Input
          id="title"
          name="title"
          placeholder="Torque wrench clicks early"
          required
        />
      </Field>

      <Field
        label="What happens"
        htmlFor="description"
        required
        hint="How to reproduce it, and anything you have already tried."
        error={state.errors?.description}
      >
        <Textarea
          id="description"
          name="description"
          rows={5}
          placeholder="Releases around 15 Nm when set to 20 Nm. Checked against the second wrench and they do not agree."
          required
        />
      </Field>

      <Field
        label="Severity"
        htmlFor="severity"
        required
        hint="Critical means the team cannot work until it is fixed."
        error={state.errors?.severity}
      >
        <Select id="severity" name="severity" defaultValue="MEDIUM">
          {SEVERITIES.map((severity) => (
            <option key={severity} value={severity}>
              {SEVERITY_LABELS[severity]}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pendingLabel="Opening…">Open ticket</SubmitButton>
    </form>
  );
}

const STATUS_STYLE: Partial<
  Record<TicketStatus, "primary" | "secondary" | "danger">
> = {
  IN_PROGRESS: "primary",
  RESOLVED: "primary",
  CLOSED: "secondary",
};

export function TicketStatusPanel({
  ticketId,
  status,
  options,
}: {
  ticketId: string;
  status: TicketStatus;
  options: TicketStatus[];
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    updateTicketStatus,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field
        label="Note (optional)"
        htmlFor={`status-note-${ticketId}`}
        hint="What changed, or what you found."
      >
        <Textarea
          id={`status-note-${ticketId}`}
          name="note"
          rows={2}
          placeholder="Tip and element replaced. Holds 350 C steadily now."
        />
      </Field>

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <SubmitButton
            key={option}
            name="status"
            value={option}
            size="sm"
            variant={STATUS_STYLE[option] ?? "secondary"}
            pendingLabel="Saving…"
          >
            {option === "IN_PROGRESS" && status !== "OPEN"
              ? "Reopen"
              : `Mark ${TICKET_STATUS_LABELS[option].toLowerCase()}`}
          </SubmitButton>
        ))}
      </div>
    </form>
  );
}

export function AssignPanel({
  ticketId,
  assignedToId,
  people,
}: {
  ticketId: string;
  assignedToId: string | null;
  people: Array<{ id: string; name: string }>;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    assignTicket,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field label="Assigned to" htmlFor={`assign-${ticketId}`}>
        <Select
          id={`assign-${ticketId}`}
          name="assignedToId"
          defaultValue={assignedToId ?? ""}
        >
          <option value="">Nobody yet</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.name}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton size="sm" variant="secondary" pendingLabel="Saving…">
        Update assignment
      </SubmitButton>
    </form>
  );
}

export function TicketNoteForm({ ticketId }: { ticketId: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    addTicketNote,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="ticketId" value={ticketId} />

      <FormError message={state.message} />
      <FormSuccess message={state.success} />

      <Field
        label="Add a note"
        htmlFor={`note-${ticketId}`}
        error={state.errors?.note}
      >
        <Textarea
          id={`note-${ticketId}`}
          name="note"
          rows={3}
          placeholder="Tried the older firmware, same result."
        />
      </Field>

      <SubmitButton size="sm" variant="secondary" pendingLabel="Adding…">
        <MessageSquarePlus className="size-3.5" aria-hidden />
        Add note
      </SubmitButton>
    </form>
  );
}
