"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { InventoryAction, Prisma } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { deriveStatus } from "@/lib/inventory";
import { fullLocation, getLocations } from "@/lib/locations";
import { readPhotoUpload, type PhotoUpload } from "@/lib/photos";
import { SAMPLE_PREFIXES } from "@/lib/sample-data";
import {
  fieldErrors,
  optionalText,
  text,
  toActionState,
  type ActionState,
} from "@/lib/actions/shared";

const ToolSchema = z.object({
  name: z.string().min(2, "Give the item a name of at least two characters."),
  category: z.string().min(2, "Enter a category, for example Hand Tools."),
  quantity: z
    .number({ error: "Enter the quantity as a number." })
    .int("Use a whole number.")
    .min(0, "Quantity cannot be negative.")
    .max(1_000_000, "That quantity looks too large."),
  unit: z.string().min(1, "Set a unit, for example pcs, rolls or sets."),
  lowStockThreshold: z
    .number({ error: "Enter the low-stock level as a number." })
    .int("Use a whole number.")
    .min(0, "The low-stock level cannot be negative."),
  storageLocationId: z.string().optional(),
  locationDetail: z.string().max(200, "Keep the exact spot short.").optional(),
  notes: z.string().optional(),
  retired: z.boolean(),
});

function numberField(formData: FormData, name: string): number {
  const value = text(formData, name);
  return value === "" ? Number.NaN : Number(value);
}

type LogInput = {
  action: InventoryAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  note?: string;
};

/** Writes audit rows inside the same transaction as the change itself. */
async function writeLogs(
  tx: Prisma.TransactionClient,
  toolId: string,
  performedById: string,
  entries: LogInput[],
): Promise<void> {
  if (entries.length === 0) return;

  await tx.inventoryLog.createMany({
    data: entries.map((entry) => ({ ...entry, toolId, performedById })),
  });
}

/**
 * Puts a photo on an item, replacing any it had. A replacement is a new row
 * with a new id, so its address changes and no cached copy of the old photo
 * is ever shown in its place.
 */
async function storePhoto(
  tx: Prisma.TransactionClient,
  toolId: string,
  uploadedById: string,
  photo: PhotoUpload,
): Promise<void> {
  await tx.toolPhoto.deleteMany({ where: { toolId } });
  await tx.toolPhoto.create({
    data: {
      toolId,
      uploadedById,
      mimeType: photo.mimeType,
      data: photo.data,
      thumb: photo.thumb,
      width: photo.width,
      height: photo.height,
      byteSize: photo.data.byteLength,
    },
  });
}

export async function saveTool(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  let savedId: string;

  try {
    const user = await assertPermission("tool:write");

    const parsed = ToolSchema.safeParse({
      name: text(formData, "name"),
      category: text(formData, "category"),
      quantity: numberField(formData, "quantity"),
      unit: text(formData, "unit") || "pcs",
      lowStockThreshold: numberField(formData, "lowStockThreshold"),
      storageLocationId: optionalText(formData, "storageLocationId"),
      locationDetail: optionalText(formData, "locationDetail"),
      notes: optionalText(formData, "notes"),
      retired: formData.get("retired") === "on",
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const input = parsed.data;
    const toolId = optionalText(formData, "id");
    const locations = await getLocations();

    // Somewhere like a drawer unit is useless without the drawer number, so
    // the location itself decides whether the exact spot is compulsory.
    const place = locations.find((l) => l.id === input.storageLocationId);

    if (place?.detailRequired && !input.locationDetail) {
      return {
        errors: {
          locationDetail: `${place.detailLabel?.trim() || "The exact spot"} is needed for anything kept in ${place.name}.`,
        },
      };
    }

    const photo = await readPhotoUpload(formData);

    if (photo && "error" in photo) {
      return { errors: { photo: photo.error } };
    }

    const removePhoto = formData.get("removePhoto") === "1";

    // RETIRED is a human decision; everything else follows the quantity.
    const status = input.retired
      ? ("RETIRED" as const)
      : deriveStatus(input.quantity, input.lowStockThreshold, "AVAILABLE");

    const data = {
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      unit: input.unit,
      lowStockThreshold: input.lowStockThreshold,
      storageLocationId: input.storageLocationId ?? null,
      locationDetail: input.locationDetail ?? null,
      notes: input.notes ?? null,
      status,
    };

    savedId = await prisma.$transaction(async (tx) => {
      if (!toolId) {
        const created = await tx.tool.create({
          data: {
            ...data,
            createdById: user.id,
            // Until it has a location, the person who added it is who to ask.
            holderId: data.storageLocationId ? null : user.id,
          },
          select: { id: true },
        });

        const entries: LogInput[] = [
          {
            action: "CREATED",
            newValue: `${data.quantity} ${data.unit}`,
            note: data.storageLocationId
              ? `Added to ${fullLocation(locations, data.storageLocationId, data.locationDetail)}`
              : "Added without a location yet",
          },
        ];

        if (photo) {
          await storePhoto(tx, created.id, user.id, photo);
          entries.push({ action: "DETAILS_UPDATED", field: "photo", newValue: "Photo added" });
        }

        await writeLogs(tx, created.id, user.id, entries);

        return created.id;
      }

      const before = await tx.tool.findUnique({
        where: { id: toolId },
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          notes: true,
          status: true,
          storageLocationId: true,
          locationDetail: true,
          holderId: true,
          photo: { select: { id: true } },
        },
      });

      if (!before) {
        throw new Error(`Tool ${toolId} no longer exists`);
      }

      await tx.tool.update({
        where: { id: toolId },
        data: {
          ...data,
          // An item taken out of its location must still have someone to ask.
          holderId:
            !data.storageLocationId && !before.holderId ? user.id : undefined,
        },
      });

      const entries: LogInput[] = [];

      if (before.quantity !== data.quantity) {
        entries.push({
          action: "QUANTITY_UPDATED",
          field: "quantity",
          oldValue: `${before.quantity} ${before.unit}`,
          newValue: `${data.quantity} ${data.unit}`,
        });
      }

      if (before.status !== data.status) {
        entries.push({
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: before.status,
          newValue: data.status,
        });
      }

      const movedPlace = before.storageLocationId !== data.storageLocationId;
      const movedSpot = (before.locationDetail ?? "") !== (data.locationDetail ?? "");

      if (movedPlace || movedSpot) {
        entries.push({
          action: "LOCATION_CHANGED",
          field: movedPlace ? "storageLocation" : "locationDetail",
          oldValue: fullLocation(
            locations,
            before.storageLocationId,
            before.locationDetail,
          ),
          newValue: fullLocation(
            locations,
            data.storageLocationId,
            data.locationDetail,
          ),
        });
      }

      const detailFields = (
        [
          ["name", before.name, data.name],
          ["category", before.category, data.category],
          ["unit", before.unit, data.unit],
          ["notes", before.notes ?? "", data.notes ?? ""],
        ] as const
      ).filter(([, oldValue, newValue]) => oldValue !== newValue);

      for (const [field, oldValue, newValue] of detailFields) {
        entries.push({
          action: "DETAILS_UPDATED",
          field,
          oldValue: String(oldValue) || "(empty)",
          newValue: String(newValue) || "(empty)",
        });
      }

      if (photo) {
        await storePhoto(tx, toolId, user.id, photo);
        entries.push({
          action: "DETAILS_UPDATED",
          field: "photo",
          newValue: before.photo ? "Photo replaced" : "Photo added",
        });
      } else if (removePhoto && before.photo) {
        await tx.toolPhoto.delete({ where: { toolId } });
        entries.push({ action: "DETAILS_UPDATED", field: "photo", newValue: "Photo removed" });
      }

      await writeLogs(tx, toolId, user.id, entries);

      return toolId;
    });
  } catch (error) {
    return toActionState(error);
  }

  revalidatePath("/");
  revalidatePath(`/tools/${savedId}`);
  revalidatePath("/dashboard");
  redirect(`/tools/${savedId}`);
}

const AdjustSchema = z.object({
  toolId: z.string().min(1),
  quantity: z
    .number({ error: "Enter the new quantity as a number." })
    .int("Use a whole number.")
    .min(0, "Quantity cannot be negative."),
  note: z.string().optional(),
});

/** Quick stock correction from the tool detail page. */
export async function updateQuantity(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const user = await assertPermission("tool:write");

    const parsed = AdjustSchema.safeParse({
      toolId: text(formData, "toolId"),
      quantity: numberField(formData, "quantity"),
      note: optionalText(formData, "note"),
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const { toolId, quantity, note } = parsed.data;

    await prisma.$transaction(async (tx) => {
      const before = await tx.tool.findUnique({
        where: { id: toolId },
        select: { quantity: true, unit: true, status: true, lowStockThreshold: true },
      });

      if (!before) throw new Error(`Tool ${toolId} no longer exists`);

      const status = deriveStatus(
        quantity,
        before.lowStockThreshold,
        before.status,
      );

      await tx.tool.update({
        where: { id: toolId },
        data: { quantity, status },
      });

      const entries: LogInput[] = [];

      if (before.quantity !== quantity) {
        entries.push({
          action: "QUANTITY_UPDATED",
          field: "quantity",
          oldValue: `${before.quantity} ${before.unit}`,
          newValue: `${quantity} ${before.unit}`,
          note,
        });
      }

      if (before.status !== status) {
        entries.push({
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: before.status,
          newValue: status,
        });
      }

      await writeLogs(tx, toolId, user.id, entries);
    });

    revalidatePath("/");
    revalidatePath(`/tools/${parsed.data.toolId}`);
    revalidatePath("/dashboard");

    return { success: "Stock updated." };
  } catch (error) {
    return toActionState(error);
  }
}

/** Retire a tool, or bring a retired one back into service. */
export async function setRetired(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const toolId = text(formData, "toolId");
  const retired = text(formData, "retired") === "true";

  try {
    const user = await assertPermission("tool:write");

    await prisma.$transaction(async (tx) => {
      const before = await tx.tool.findUnique({
        where: { id: toolId },
        select: { quantity: true, lowStockThreshold: true, status: true },
      });

      if (!before) throw new Error(`Tool ${toolId} no longer exists`);

      const status = retired
        ? ("RETIRED" as const)
        : deriveStatus(before.quantity, before.lowStockThreshold, "AVAILABLE");

      if (status === before.status) return;

      await tx.tool.update({ where: { id: toolId }, data: { status } });

      await writeLogs(tx, toolId, user.id, [
        {
          action: "STATUS_CHANGED",
          field: "status",
          oldValue: before.status,
          newValue: status,
        },
      ]);
    });

    revalidatePath("/");
    revalidatePath(`/tools/${toolId}`);
    revalidatePath("/dashboard");

    return {
      success: retired ? "Marked as retired." : "Back in service.",
    };
  } catch (error) {
    return toActionState(error);
  }
}

export async function deleteTool(formData: FormData): Promise<void> {
  await assertPermission("tool:delete");

  const toolId = text(formData, "toolId");
  await prisma.tool.delete({ where: { id: toolId } });

  revalidatePath("/");
  revalidatePath("/tools/manage");
  revalidatePath("/dashboard");
  redirect("/");
}

/** Removes several items at once from the manage screen. */
export async function deleteTools(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertPermission("tool:delete");

    const ids = formData
      .getAll("toolIds")
      .map(String)
      .filter((id) => id.length > 0);

    if (ids.length === 0) {
      return { message: "Tick at least one item first." };
    }

    const { count } = await prisma.tool.deleteMany({ where: { id: { in: ids } } });

    revalidatePath("/");
    revalidatePath("/tools/manage");
    revalidatePath("/dashboard");

    return {
      success: `Removed ${count} ${count === 1 ? "item" : "items"}, along with their history and any maintenance jobs raised against them.`,
    };
  } catch (error) {
    return toActionState(error);
  }
}

/**
 * Clears the example data the app shipped with, in one step, so the team can
 * start from their own real stock. Identified by seeded id prefix, so nothing
 * added through the app can be caught by it.
 */
export async function removeSampleData(): Promise<ActionState> {
  try {
    await assertPermission("tool:delete");

    const removed = await prisma.$transaction(async (tx) => {
      const tickets = await tx.repairTicket.deleteMany({
        where: { id: { startsWith: SAMPLE_PREFIXES.ticket } },
      });

      const requests = await tx.procurementRequest.deleteMany({
        where: { id: { startsWith: SAMPLE_PREFIXES.request } },
      });

      // Cascades the remaining logs and any tickets still attached.
      const tools = await tx.tool.deleteMany({
        where: { id: { startsWith: SAMPLE_PREFIXES.tool } },
      });

      return {
        tickets: tickets.count,
        requests: requests.count,
        tools: tools.count,
      };
    });

    revalidatePath("/");
    revalidatePath("/tools/manage");
    revalidatePath("/dashboard");
    revalidatePath("/requisitions");
    revalidatePath("/tickets");

    if (removed.tools === 0 && removed.requests === 0 && removed.tickets === 0) {
      return { success: "There was no sample data left to remove." };
    }

    return {
      success: `Removed ${removed.tools} sample items, ${removed.requests} sample requests and ${removed.tickets} sample maintenance jobs. Sample storage locations were left alone, so your own items keep somewhere to live.`,
    };
  } catch (error) {
    return toActionState(error);
  }
}
