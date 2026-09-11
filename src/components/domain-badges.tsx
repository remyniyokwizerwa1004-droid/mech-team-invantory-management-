import type {
  RequestStatus,
  TicketSeverity,
  TicketStatus,
  ToolStatus,
  Urgency,
  UserRole,
} from "@/generated/prisma/client";
import { CircleCheck, CircleDashed, Hammer, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_TONES,
  SEVERITY_LABELS,
  SEVERITY_TONES,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  TOOL_STATUS_LABELS,
  TOOL_STATUS_TONES,
  URGENCY_LABELS,
  URGENCY_TONES,
} from "@/lib/display";
import { ROLE_LABELS } from "@/lib/permissions";
import {
  PROGRESS_TEXT_CLASSES,
  PROGRESS_TONES,
  progressText,
  ticketProgress,
  type TicketProgress,
} from "@/lib/tickets";
import { cn } from "@/lib/utils";

const PROGRESS_ICONS: Record<TicketProgress, LucideIcon> = {
  unclaimed: TriangleAlert,
  waiting: CircleDashed,
  active: Hammer,
  done: CircleCheck,
};

export function ToolStatusBadge({ status }: { status: ToolStatus }) {
  return (
    <Badge tone={TOOL_STATUS_TONES[status]} dot>
      {TOOL_STATUS_LABELS[status]}
    </Badge>
  );
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge tone={REQUEST_STATUS_TONES[status]} dot>
      {REQUEST_STATUS_LABELS[status]}
    </Badge>
  );
}

export function TicketStatusBadge({ status }: { status: TicketStatus }) {
  return (
    <Badge tone={TICKET_STATUS_TONES[status]} dot>
      {TICKET_STATUS_LABELS[status]}
    </Badge>
  );
}

/**
 * Says who is dealing with a fault, beside the status badge that says what
 * stage it is at. Colour-coded so an unattended problem stands out in a list.
 */
export function TicketProgressNote({
  ticket,
  className,
}: {
  ticket: { status: TicketStatus; assignedTo: { name: string } | null };
  className?: string;
}) {
  const progress = ticketProgress(ticket);
  const Icon = PROGRESS_ICONS[progress];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-medium",
        PROGRESS_TEXT_CLASSES[progress],
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {progressText(ticket)}
    </span>
  );
}

export function TicketProgressBadge({
  ticket,
}: {
  ticket: { status: TicketStatus; assignedTo: { name: string } | null };
}) {
  const progress = ticketProgress(ticket);

  return (
    <Badge tone={PROGRESS_TONES[progress]} dot>
      {progressText(ticket)}
    </Badge>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  return <Badge tone={URGENCY_TONES[urgency]}>{URGENCY_LABELS[urgency]}</Badge>;
}

export function SeverityBadge({ severity }: { severity: TicketSeverity }) {
  return (
    <Badge tone={SEVERITY_TONES[severity]}>{SEVERITY_LABELS[severity]}</Badge>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  const tone =
    role === "SUPER_ADMIN" ? "accent" : role === "INVENTORY_MANAGER" ? "info" : "neutral";

  return <Badge tone={tone}>{ROLE_LABELS[role]}</Badge>;
}
