"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { RequestStatus, Urgency } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveStatus } from "@/lib/inventory";
import { fullLocation, getLocations } from "@/lib/locations";
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
    const locations = await getLocations();

    // A request for something the team has never stocked has no item to top
    // up. Receiving it creates the item instead, so the details it needs are
    // checked before anything is written.
    let arrival: {
      category: string;
      lowStockThreshold: number;
      storageLocationId: string | null;
      locationDetail: string | null;
    } | null = null;

    if (toStatus === "RECEIVED") {
      const pending = await prisma.procurementRequest.findUnique({
        where: { id: requestId },
        select: { toolId: true },
      });

      if (pending && !pending.toolId) {
        const lowRaw = text(formData, "receiveLowStock");
        const lowStockThreshold = lowRaw === "" ? 1 : Number(lowRaw);

        if (!Number.isInteger(lowStockThreshold) || lowStockThreshold < 0) {
          return {
            errors: { receiveLowStock: "Enter the low-stock level as a whole number." },
          };
        }

        const storageLocationId = optionalText(formData, "storageLocationId") ?? null;
        const locationDetail = optionalText(formData, "locationDetail") ?? null;
        const place = locations.find((l) => l.id === storageLocationId);

        if (storageLocationId && !place) {
          return { errors: { storageLocationId: "That location no longer exists. Pick another." } };
        }

        if (place?.detailRequired && !locationDetail) {
          return {
            errors: {
              locationDetail: `${place.detailLabel?.trim() || "The exact spot"} is needed for anything kept in ${place.name}. Or leave the location empty and add it later.`,
            },
          };
        }

        arrival = {
          category: optionalText(formData, "receiveCategory") ?? "Uncategorised",
          lowStockThreshold,
          storageLocationId,
          locationDetail,
        };
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const request = await tx.procurementRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          status: true,
          toolId: true,
          quantityRequested: true,
          unit: true,
          itemName: true,
          approvedById: true,
          approvedBy: { select: { name: true } },
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

      // A new item arrives: it goes into live stock now, with or without a
      // location. Until it has one, the person who approved the request is
      // who everyone is told to ask.
      if (toStatus === "RECEIVED" && !request.toolId && arrival) {
        const approverName = request.approvedBy?.name ?? user.name;
        const quantity = request.quantityRequested;

        const created = await tx.tool.create({
          data: {
            name: request.itemName,
            category: arrival.category,
            quantity,
            unit: request.unit,
            lowStockThreshold: arrival.lowStockThreshold,
            status: deriveStatus(quantity, arrival.lowStockThreshold, "AVAILABLE"),
            storageLocationId: arrival.storageLocationId,
            locationDetail: arrival.locationDetail,
            createdById: user.id,
            holderId: request.approvedById ?? user.id,
          },
          select: { id: true },
        });

        await tx.procurementRequest.update({
          where: { id: requestId },
          data: { toolId: created.id },
        });

        const placed = arrival.storageLocationId
          ? fullLocation(locations, arrival.storageLocationId, arrival.locationDetail)
          : null;

        await tx.inventoryLog.create({
          data: {
            toolId: created.id,
            action: "CREATED",
            newValue: `${quantity} ${request.unit}`,
            note: placed
              ? `Arrived through a request approved by ${approverName}, and put in ${placed}.`
              : `Arrived through a request approved by ${approverName}. No location yet.`,
            performedById: user.id,
          },
        });

        return {
          success: placed
            ? `Received. ${request.itemName} is now in the inventory at ${placed}.`
            : `Received. ${request.itemName} is now in the inventory. Until someone gives it a location, people are told to ask ${approverName}.`,
        };
      }

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
    revalidatePath("/locations");
    revalidatePath("/");

    return result;
  } catch (error) {
    return toActionState(error);
  }
}
