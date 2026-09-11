"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { RequestStatus, Urgency } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveStatus } from "@/lib/inventory";
import {
  fieldErrors,
  optionalText,
  text,
  toActionState,
  type ActionState,
} from "@/lib/actions/shared";
import { nextRequestStatuses } from "@/lib/workflow";

const URGENCIES: Urgency[] = ["LOW", "NORMAL", "HIGH", "CRITICAL"];

const CreateSchema = z.object({
  itemName: z.string().min(2, "Name the item you need."),
  quantityRequested: z
    .number({ error: "Enter how many you need." })
    .int("Use a whole number.")
    .min(1, "Ask for at least one."),
  unit: z.string().min(1, "Set a unit, for example pcs."),
  reason: z.string().optional(),
  urgency: z.enum(URGENCIES as [Urgency, ...Urgency[]]),
  toolId: z.string().optional(),
});

function numberField(formData: FormData, name: string): number {
  const value = text(formData, name);
  return value === "" ? Number.NaN : Number(value);
}

export async function createRequest(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let createdId: string;

  try {
    const user = await assertPermission("requisition:create");

    const parsed = CreateSchema.safeParse({
      itemName: text(formData, "itemName"),
      quantityRequested: numberField(formData, "quantityRequested"),
      unit: text(formData, "unit") || "pcs",
      reason: optionalText(formData, "reason"),
      urgency: text(formData, "urgency") || "NORMAL",
      toolId: optionalText(formData, "toolId"),
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const input = parsed.data;

    createdId = await prisma.$transaction(async (tx) => {
      const request = await tx.procurementRequest.create({
        data: {
          itemName: input.itemName,
          quantityRequested: input.quantityRequested,
          unit: input.unit,
          reason: input.reason ?? null,
          urgency: input.urgency,
          toolId: input.toolId ?? null,
          requestedById: user.id,
        },
        select: { id: true },
      });

      await tx.procurementEvent.create({
        data: {
          requestId: request.id,
          fromStatus: null,
          toStatus: "REQUESTED",
          note: input.reason ?? null,
          actorId: user.id,
        },
      });

      return request.id;
    });
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/requisitions");
  revalidatePath("/dashboard");
  redirect(`/requisitions/${createdId}`);
}

export async function decideRequest(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("requisition:decide");

    const requestId = text(formData, "requestId");
    const toStatus = text(formData, "status") as RequestStatus;
    const note = optionalText(formData, "note");
    const addToStock = formData.get("addToStock") === "on";

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.procurementRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
          toolId: true,
          quantityRequested: true,
          itemName: true,
        },
      });

      if (!request) return { message: "That request no longer exists." };

      if (!nextRequestStatuses(request.status).includes(toStatus)) {
        return {
          message: `A ${request.status.toLowerCase()} request cannot move to ${toStatus.toLowerCase()}.`,
        };
      }

      await tx.procurementRequest.update({
        where: { id: requestId },
        data: {
          status: toStatus,
          // Whoever moves it out of "requested" is the one who decided on it.
          approvedById:
            toStatus === "APPROVED" || toStatus === "REJECTED"
              ? user.id
              : undefined,
        },
      });

      await tx.procurementEvent.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus,
          note: note ?? null,
          actorId: user.id,
        },
      });

      // Receiving stock is the point where inventory should change.
      if (toStatus === "RECEIVED" && addToStock && request.toolId) {
        const tool = await tx.tool.findUnique({
          where: { id: request.toolId },
          select: {
            quantity: true,
            unit: true,
            status: true,
            lowStockThreshold: true,
          },
        });

        if (tool) {
          const quantity = tool.quantity + request.quantityRequested;
          const status = deriveStatus(
            quantity,
            tool.lowStockThreshold,
            tool.status,
          );

          await tx.tool.update({
            where: { id: request.toolId },
            data: { quantity, status },
          });

          await tx.inventoryLog.create({
            data: {
              toolId: request.toolId,
              action: "RESTOCKED",
              field: "quantity",
              oldValue: `${tool.quantity} ${tool.unit}`,
              newValue: `${quantity} ${tool.unit}`,
              note: `Received against the request for ${request.itemName}.`,
              performedById: user.id,
            },
          });

          return {
            success: `Marked as received and added ${request.quantityRequested} ${tool.unit} to stock.`,
          };
        }
      }

      return { success: `Request marked as ${toStatus.toLowerCase()}.` };
    });

    revalidatePath("/requisitions");
    revalidatePath(`/requisitions/${requestId}`);
    revalidatePath("/dashboard");
    revalidatePath("/");

    return result;
  } catch (error) {
    return toActionState(error);
  }
}
