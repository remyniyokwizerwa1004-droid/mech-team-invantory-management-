import type { RequestStatus, TicketStatus } from "@/generated/prisma/client";

/**
 * The status flows, in one place. Both the buttons a page offers and the
 * server-side check use these maps, so the UI can never suggest a move the
 * action would refuse.
 */

const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["ORDERED", "REJECTED"],
  ORDERED: ["RECEIVED", "REJECTED"],
  RECEIVED: [],
  REJECTED: [],
};

const TICKET_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "RESOLVED", "CLOSED"],
  IN_PROGRESS: ["RESOLVED", "CLOSED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: ["IN_PROGRESS"],
};

export function nextRequestStatuses(status: RequestStatus): RequestStatus[] {
  return REQUEST_TRANSITIONS[status];
}

export function nextTicketStatuses(status: TicketStatus): TicketStatus[] {
  return TICKET_TRANSITIONS[status];
}
