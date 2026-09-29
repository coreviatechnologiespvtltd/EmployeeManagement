"use client";

import { cn } from "@/lib/cn";

/**
 * Wraps react-hook-form field binding so error wiring (`aria-invalid`,
 * `aria-describedby`) and layout are defined once instead of per form.
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-700">
        {label}
        {required && (
          <span aria-hidden className="ml-0.5 text-danger-600">
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
