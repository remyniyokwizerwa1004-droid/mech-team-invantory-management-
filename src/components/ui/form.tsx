import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const CONTROL =
  "w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink " +
  "placeholder:text-muted focus:border-brand disabled:bg-surface-sunken " +
  "disabled:text-muted";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-ink"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-critical" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {children}

      {error ? (
        <p className="text-sm text-critical">{error}</p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, "h-10", className)} />;
}

export function Select({
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(CONTROL, "h-10", className)} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(CONTROL, "py-2", className)} />;
}

/** Banner for an error that applies to the whole form rather than one field. */
export function FormError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="rounded-lg border border-critical-line bg-critical-soft px-3 py-2 text-sm text-critical"
    >
      {message}
    </p>
  );
}

export function FormSuccess({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <p
      role="status"
      className="rounded-lg border border-positive-line bg-positive-soft px-3 py-2 text-sm text-positive"
    >
      {message}
    </p>
  );
}
