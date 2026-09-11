import type { TicketStatus } from "@/generated/prisma/client";
import type { Tone } from "@/lib/display";

/**
 * Whether anyone is actually dealing with a ticket.
 *
 * The status on its own does not answer that. A fault can sit at "Open" for a
 * fortnight with nobody assigned to it, and in a list it looks identical to one
 * somebody picked up an hour ago. This splits the two apart so the whole team
 * can see, at a glance, which problems are being handled and which are being
 * ignored.
 */
export type TicketProgress = "unclaimed" | "waiting" | "active" | "done";

type ProgressInput = {
  status: TicketStatus;
  assignedTo: { name: string } | null;
};

export function ticketProgress(ticket: ProgressInput): TicketProgress {
  if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") return "done";
  if (ticket.status === "IN_PROGRESS") return "active";
  return ticket.assignedTo ? "waiting" : "unclaimed";
}

/** Plain-language version, naming the person wherever there is one. */
export function progressText(ticket: ProgressInput): string {
  const name = ticket.assignedTo?.name;

  switch (ticketProgress(ticket)) {
    case "unclaimed":
      return "Nobody is on this yet";
    case "waiting":
      return `${name} has it, not started yet`;
    case "active":
      return name ? `${name} is working on it` : "Someone is working on it";
    case "done":
      return name ? `Dealt with by ${name}` : "Dealt with";
  }
}

export const PROGRESS_TONES: Record<TicketProgress, Tone> = {
  unclaimed: "critical",
  waiting: "warning",
  active: "accent",
  done: "positive",
};

/** Matches the `text-*` colour tokens used by the badges. */
export const PROGRESS_TEXT_CLASSES: Record<TicketProgress, string> = {
  unclaimed: "text-critical",
  waiting: "text-warning",
  active: "text-accent",
  done: "text-positive",
};
