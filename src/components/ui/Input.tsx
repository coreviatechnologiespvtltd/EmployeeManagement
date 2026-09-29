import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";

const fieldBase =
  "w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900 placeholder:text-ink-400 " +
  "transition-colors duration-150 hover:border-ink-300 " +
  "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500";

const invalidClasses = "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leadingIcon?: ReactNode;
  trailingSlot?: ReactNode;
  required?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, label, error, hint, leadingIcon, trailingSlot, id, required, ...props },
  ref,
) {
  const inputId = id ?? props.name;
  const describedBy = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

  const input = (
    <div className="relative">
      {leadingIcon && (
        <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-ink-400">
          {leadingIcon}
        </span>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn(
          fieldBase,
          "h-10",
          leadingIcon ? "pl-10" : null,
          trailingSlot ? "pr-10" : null,
          error && invalidClasses,
          className,
        )}
        {...props}
      />
      {trailingSlot && (
        <span className="absolute inset-y-0 right-0 flex w-10 items-center justify-center">
          {trailingSlot}
        </span>
      )}
    </div>
  );

  if (!label && !error && !hint) return input;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
        </label>
      )}
      {input}
      <FieldMessage id={inputId} error={error} hint={hint} />
    </div>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, label, error, hint, id, required, rows = 4, ...props },
  ref,
) {
  const fieldId = id ?? props.name;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        aria-required={required || undefined}
        className={cn(fieldBase, "resize-y py-2.5 leading-relaxed", error && invalidClasses, className)}
        {...props}
      />
      <FieldMessage id={fieldId} error={error} hint={hint} />
    </div>
  );
});

function FieldMessage({ id, error, hint }: { id?: string; error?: string; hint?: string }) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="flex items-center gap-1 text-xs text-danger-600">
        <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-xs text-ink-400">
        {hint}
      </p>
    );
  }
  return null;
}
