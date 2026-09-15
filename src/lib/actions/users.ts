"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { UserRole } from "@/generated/prisma/client";
import { assertPermission } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  fieldErrors,
  text,
  toActionState,
  type ActionState,
} from "@/lib/actions/shared";

const ROLES: UserRole[] = ["SUPER_ADMIN", "INVENTORY_MANAGER"];

const PasswordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .regex(/[a-zA-Z]/, "Include at least one letter.")
  .regex(/[0-9]/, "Include at least one number.");

const CreateUserSchema = z.object({
  name: z.string().min(2, "Enter the person's name."),
  email: z.email("Enter a valid email address."),
  role: z.enum(ROLES as [UserRole, ...UserRole[]]),
  password: PasswordSchema,
});

/** Refuses to leave the system without anyone who can manage accounts. */
async function assertNotLastSuperAdmin(userId: string): Promise<void> {
  const remaining = await prisma.user.count({
    where: { role: "SUPER_ADMIN", isActive: true, id: { not: userId } },
  });

  if (remaining === 0) {
    throw new Error("LAST_SUPER_ADMIN");
  }
}

function lastAdminMessage(error: unknown): ActionState | null {
  if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") {
    return {
      message:
        "This is the only active super admin. Promote someone else first, or nobody will be able to manage accounts.",
    };
  }

  return null;
}

export async function createUser(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertPermission("user:manage");

    const parsed = CreateUserSchema.safeParse({
      name: text(formData, "name"),
      email: text(formData, "email").toLowerCase(),
      role: text(formData, "role"),
      password: String(formData.get("password") ?? ""),
    });

    if (!parsed.success) {
      return { errors: fieldErrors(parsed.error) };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });

    if (existing) {
      return { errors: { email: "Someone already uses that email address." } };
    }

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
      },
    });

    revalidatePath("/admin/users");

    return { success: `${parsed.data.name} can now sign in.` };
  } catch (error) {
    return toActionState(error);
  }
}

export async function updateUserRole(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await assertPermission("user:manage");

    const userId = text(formData, "userId");
    const role = text(formData, "role") as UserRole;

    if (!ROLES.includes(role)) {
      return { message: "That is not a role this system knows about." };
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, name: true, isActive: true },
    });

    if (!target) return { message: "That account no longer exists." };
    if (target.role === role) return {};

    if (target.role === "SUPER_ADMIN" && target.isActive) {
      await assertNotLastSuperAdmin(userId);
    }

    await prisma.user.update({ where: { id: userId }, data: { role } });

    revalidatePath("/admin/users");

    return {
      success:
        userId === actor.id
          ? "You changed your own role. Some pages may no longer be available to you."
          : `${target.name}'s role updated.`,
    };
  } catch (error) {
    return lastAdminMessage(error) ?? toActionState(error);
  }
}

export async function setUserActive(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const actor = await assertPermission("user:manage");

    const userId = text(formData, "userId");
    const isActive = text(formData, "isActive") === "true";

    if (userId === actor.id && !isActive) {
      return { message: "You cannot disable your own account." };
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, role: true },
    });

    if (!target) return { message: "That account no longer exists." };

    if (!isActive && target.role === "SUPER_ADMIN") {
      await assertNotLastSuperAdmin(userId);
    }

    await prisma.user.update({ where: { id: userId }, data: { isActive } });

    revalidatePath("/admin/users");

    return {
      success: isActive
        ? `${target.name} can sign in again.`
        : `${target.name} has been disabled and signed out.`,
    };
  } catch (error) {
    return lastAdminMessage(error) ?? toActionState(error);
  }
}

export async function resetPassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    await assertPermission("user:manage");

    const userId = text(formData, "userId");
    const parsed = PasswordSchema.safeParse(
      String(formData.get("password") ?? ""),
    );

    if (!parsed.success) {
      return { errors: { password: parsed.error.issues[0]?.message } };
    }

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });

    if (!target) return { message: "That account no longer exists." };

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(parsed.data, 10) },
    });

    revalidatePath("/admin/users");

    return {
      success: `New password set for ${target.name}. Pass it on privately and ask them to change it.`,
    };
  } catch (error) {
    return toActionState(error);
  }
}
