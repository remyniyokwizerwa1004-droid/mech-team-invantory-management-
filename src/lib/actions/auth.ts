"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { fieldErrors, type ActionState } from "@/lib/actions/shared";

const LoginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export async function login(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = LoginSchema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, role: true, passwordHash: true, isActive: true },
  });

  // Hash a throwaway value when the email is unknown, so a wrong email and a
  // wrong password take the same amount of time to reject.
  const passwordMatches = user
    ? await bcrypt.compare(parsed.data.password, user.passwordHash)
    : await bcrypt.compare(parsed.data.password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidin");

  if (!user || !passwordMatches) {
    return { message: "That email and password do not match an account." };
  }

  if (!user.isActive) {
    return {
      message: "This account has been disabled. Ask a super admin to re-enable it.",
    };
  }

  await createSession({ userId: user.id, role: user.role });

  // Only ever redirect within this app, so a crafted ?next= cannot bounce
  // someone to another site straight after they type their password.
  const requested = String(formData.get("next") ?? "");
  const destination =
    requested.startsWith("/") && !requested.startsWith("//") ? requested : "/";

  redirect(destination);
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/");
}
