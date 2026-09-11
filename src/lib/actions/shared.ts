import "server-only";

import type { ZodError } from "zod";

import { AuthorizationError } from "@/lib/auth";

/**
 * What every server action in this app returns, and what every form reads
 * through useActionState.
 */
export type ActionState = {
  /** Form-level failure, shown as a banner above the fields. */
  message?: string;
  /** Form-level success, shown the same way. */
  success?: string;
  /** Per-field failures, keyed by the field's `name`. */
  errors?: Record<string, string>;
};

/** Collapses a Zod error into one message per field. */
export function fieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    result[key] ??= issue.message;
  }

  return result;
}

/**
 * Turns a thrown AuthorizationError into a message the form can show, and
 * lets everything else through. Anything unexpected is logged server-side and
 * reported generically, so a database error never leaks its detail to a
 * browser.
 */
export function toActionState(error: unknown): ActionState {
  if (error instanceof AuthorizationError) {
    return { message: error.message };
  }

  console.error(error);

  return {
    message: "Something went wrong saving that. Please try again.",
  };
}

/** Reads a trimmed string from a form. Returns "" when absent. */
export function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Reads a string, or undefined when the field was left blank. */
export function optionalText(
  formData: FormData,
  name: string,
): string | undefined {
  const value = text(formData, name);
  return value === "" ? undefined : value;
}
