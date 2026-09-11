import type {
  InventoryAction,
  RequestStatus,
  TicketEventType,
  TicketSeverity,
  TicketStatus,
  ToolStatus,
  Urgency,
} from "@/generated/prisma/client";

/** Visual weight of a badge. Mapped to colours in components/ui/badge.tsx. */
export type Tone =
  | "positive"
  | "warning"
  | "critical"
  | "neutral"
  | "info"
  | "accent";

export const TOOL_STATUS_LABELS: Record<ToolStatus, string> = {
  AVAILABLE: "In stock",
  LOW_STOCK: "Low stock",
  FINISHED: "Finished",
  RETIRED: "Retired",
};

export const TOOL_STATUS_TONES: Record<ToolStatus, Tone> = {
  AVAILABLE: "positive",
  LOW_STOCK: "warning",
  FINISHED: "critical",
  RETIRED: "neutral",
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  REQUESTED: "Requested",
  APPROVED: "Approved",
  ORDERED: "Ordered",
  RECEIVED: "Received",
  REJECTED: "Rejected",
};

export const REQUEST_STATUS_TONES: Record<RequestStatus, Tone> = {
  REQUESTED: "info",
  APPROVED: "accent",
  ORDERED: "accent",
  RECEIVED: "positive",
  REJECTED: "critical",
};

export const URGENCY_LABELS: Record<Urgency, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const URGENCY_TONES: Record<Urgency, Tone> = {
  LOW: "neutral",
  NORMAL: "info",
  HIGH: "warning",
  CRITICAL: "critical",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export const TICKET_STATUS_TONES: Record<TicketStatus, Tone> = {
  OPEN: "warning",
  IN_PROGRESS: "accent",
  RESOLVED: "positive",
  CLOSED: "neutral",
};

export const SEVERITY_LABELS: Record<TicketSeverity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const SEVERITY_TONES: Record<TicketSeverity, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "critical",
};

export const INVENTORY_ACTION_LABELS: Record<InventoryAction, string> = {
  CREATED: "Added to inventory",
  QUANTITY_UPDATED: "Quantity changed",
  STATUS_CHANGED: "Status changed",
  LOCATION_CHANGED: "Location changed",
  DETAILS_UPDATED: "Details updated",
  RESTOCKED: "Restocked from a request",
};

export const TICKET_EVENT_LABELS: Record<TicketEventType, string> = {
  OPENED: "Job opened",
  STATUS_CHANGED: "Status changed",
  ASSIGNED: "Assignment changed",
  COMMENT: "Note added",
};

/** The order statuses are shown in filters and on the dashboard. */
export const TOOL_STATUS_ORDER: ToolStatus[] = [
  "AVAILABLE",
  "LOW_STOCK",
  "FINISHED",
  "RETIRED",
];

export const REQUEST_STATUS_ORDER: RequestStatus[] = [
  "REQUESTED",
  "APPROVED",
  "ORDERED",
  "RECEIVED",
  "REJECTED",
];

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
];

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DATE_ONLY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateTime(value: Date): string {
  return DATE_TIME.format(value);
}

export function formatDate(value: Date): string {
  return DATE_ONLY.format(value);
}

/** "3 days ago" style text for activity feeds and freshness hints. */
export function formatRelative(value: Date, now: Date = new Date()): string {
  const seconds = Math.round((now.getTime() - value.getTime()) / 1000);

  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;

  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;

  const years = Math.round(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}
