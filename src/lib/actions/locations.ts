"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLocations, withDescendants } from "@/lib/locations";
import {
  fieldErrors,
  optionalText,
  text,
  toActionState,
  type ActionState,
} from "@/lib/actions/shared";

const LocationSchema = z.object({
  name: z.string().min(2, "Give the location a name."),
  code: z.string().optional(),
  description: z.string().optional(),
  parentId: z.string().optional(),
});

export async function saveLocation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertPermission("location:write");

    const parsed = LocationSchema.safeParse({
      name: text(formData, "name"),
      code: optionalText(formData, "code"),
      description: optionalText(formData, "description"),
      parentId: optionalText(formData, "parentId"),
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const id = optionalText(formData, "id");
    const { name, code, description, parentId } = parsed.data;

    if (id && parentId) {
      // A location cannot sit inside itself, nor inside one of its own
      // children, which would strand the whole branch.
      const locations = await getLocations();

      if (withDescendants(locations, id).includes(parentId)) {
        return {
          errors: {
            parentId: "A location cannot be placed inside itself or its own shelves.",
          },
        };
      }
    }

    const data = {
      name,
      code: code ?? null,
      description: description ?? null,
      parentId: parentId ?? null,
    };

    if (id) {
      await prisma.storageLocation.update({ where: { id }, data });
    } else {
      await prisma.storageLocation.create({ data });
    }

    revalidatePath("/locations");
    revalidatePath("/");

    return { success: id ? "Location updated." : `Added ${name}.` };
  } catch (error) {
    // A duplicate code is a user mistake, not a server fault.
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { errors: { code: "That code is already used by another location." } };
    }

    return toActionState(error);
  }
}

export async function deleteLocation(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertPermission("location:write");

    const id = text(formData, "id");

    const toolCount = await prisma.tool.count({
      where: { storageLocationId: id },
    });

    if (toolCount > 0) {
      return {
        message: `That location still holds ${toolCount} ${
          toolCount === 1 ? "item" : "items"
        }. Move them somewhere else first.`,
      };
    }

    // Children survive: onDelete SetNull promotes them to top level rather
    // than deleting a whole branch by surprise.
    await prisma.storageLocation.delete({ where: { id } });

    revalidatePath("/locations");
    revalidatePath("/");

    return { success: "Location removed." };
  } catch (error) {
    return toActionState(error);
  }
}
