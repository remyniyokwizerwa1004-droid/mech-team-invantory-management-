"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { TicketSeverity, TicketStatus } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fieldErrors,
  optionalText,
  text,
  toActionState,
  type ActionState,
} from "@/lib/actions/shared";
import { nextTicketStatuses } from "@/lib/workflow";

const SEVERITIES: TicketSeverity[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const CreateSchema = z.object({
  toolId: z.string().min(1, "Choose the tool this is about."),
  title: z.string().min(4, "Summarise the problem in a few words."),
  description: z
    .string()
    .min(10, "Describe what happens, so whoever picks this up can reproduce it."),
  severity: z.enum(SEVERITIES as [TicketSeverity, ...TicketSeverity[]]),
});

export async function createTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let createdId: string;

  try {
    const user = await assertPermission("ticket:create");

    const parsed = CreateSchema.safeParse({
      toolId: text(formData, "toolId"),
      title: text(formData, "title"),
      description: text(formData, "description"),
      severity: text(formData, "severity") || "MEDIUM",
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const input = parsed.data;

    createdId = await prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.create({
        data: { ...input, openedById: user.id },
        select: { id: true },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          type: "OPENED",
          toValue: "OPEN",
          actorId: user.id,
        },
      });

      return ticket.id;
    });
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  redirect(`/tickets/${createdId}`);
}

export async function updateTicketStatus(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = text(formData, "ticketId");

  try {
    const user = await assertPermission("ticket:manage");

    const toStatus = text(formData, "status") as TicketStatus;
    const note = optionalText(formData, "note");

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.findUnique({
        where: { id: ticketId },
        select: { status: true },
      });

      if (!ticket) return { message: "That ticket no longer exists." };

      if (!nextTicketStatuses(ticket.status).includes(toStatus)) {
        return {
          message: `A ticket that is ${ticket.status
            .toLowerCase()
            .replace("_", " ")} cannot move straight to ${toStatus
            .toLowerCase()
            .replace("_", " ")}.`,
        };
      }

      await tx.repairTicket.update({
        where: { id: ticketId },
        data: {
          status: toStatus,
          resolvedAt: toStatus === "RESOLVED" ? new Date() : null,
        },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          type: "STATUS_CHANGED",
          fromValue: ticket.status,
          toValue: toStatus,
          note: note ?? null,
          actorId: user.id,
        },
      });

      return { success: "Ticket updated." };
    });

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);
    revalidatePath("/dashboard");

    return result;
  } catch (error) {
    return toActionState(error);
  }
}

export async function assignTicket(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = text(formData, "ticketId");

  try {
    const user = await assertPermission("ticket:manage");

    const assignedToId = optionalText(formData, "assignedToId") ?? null;

    const result = await prisma.$transaction(async (tx) => {
      const ticket = await tx.repairTicket.findUnique({
        where: { id: ticketId },
        select: { assignedTo: { select: { id: true, name: true } } },
      });

      if (!ticket) return { message: "That ticket no longer exists." };
      if ((ticket.assignedTo?.id ?? null) === assignedToId) return {};

      const assignee = assignedToId
        ? await tx.user.findUnique({
            where: { id: assignedToId },
            select: { name: true, isActive: true },
          })
        : null;

      if (assignedToId && (!assignee || !assignee.isActive)) {
        return { message: "That person does not have an active account." };
      }

      await tx.repairTicket.update({
        where: { id: ticketId },
        data: { assignedToId },
      });

      await tx.ticketEvent.create({
        data: {
          ticketId,
          type: "ASSIGNED",
          fromValue: ticket.assignedTo?.name ?? null,
          toValue: assignee?.name ?? "Nobody",
          actorId: user.id,
        },
      });

      return {
        success: assignee
          ? `Assigned to ${assignee.name}.`
          : "Assignment cleared.",
      };
    });

    revalidatePath("/tickets");
    revalidatePath(`/tickets/${ticketId}`);

    return result;
  } catch (error) {
    return toActionState(error);
  }
}

export async function addTicketNote(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const ticketId = text(formData, "ticketId");

  try {
    // Anyone who can open a ticket can add to the conversation on one.
    const user = await assertPermission("ticket:create");

    const note = text(formData, "note");

    if (note.length < 2) {
      return { errors: { note: "Write a note before adding it." } };
    }

    await prisma.ticketEvent.create({
      data: { ticketId, type: "COMMENT", note, actorId: user.id },
    });

    revalidatePath(`/tickets/${ticketId}`);

    return { success: "Note added." };
  } catch (error) {
    return toActionState(error);
  }
}
