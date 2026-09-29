import { forwardRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

export interface SelectOptionItem {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  hint?: string;
  options: readonly SelectOptionItem[] | string[];
  placeholder?: string;
  required?: boolean;
}

function normalise(options: SelectProps["options"]): SelectOptionItem[] {
  return options.map((option) => (typeof option === "string" ? { value: option, label: option } : option));
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, error, hint, options, placeholder, id, required, ...props },
  ref,
) {
  const selectId = id ?? props.name;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ink-700">
          {label}
          {required && (
            <span aria-hidden className="ml-0.5 text-danger-600">
              *
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          className={cn(
            "h-10 w-full appearance-none rounded-lg border bg-white pl-3 pr-9 text-sm text-ink-900",
            "transition-colors duration-150 hover:border-ink-300",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-500",
            error ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20" : "border-ink-200 focus:border-brand-500",
            className,
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {normalise(options).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        />
      </div>
      {error ? (
        <p id={`${selectId}-error`} role="alert" className="flex items-center gap-1 text-xs text-danger-600">
          <AlertCircle aria-hidden className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="text-xs text-ink-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
});

export function DateField({
  label,
  error,
  hint,
  id,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  error?: string;
  hint?: string;
  id?: string;
}) {
  const fieldId = id ?? props.name;
  return (
    <div className="space-y-1.5">
      {label && <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">{label}</label>}
      <input
        type="date"
        id={fieldId}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-10 w-full rounded-lg border border-ink-200 bg-white px-3 text-sm text-ink-900",
          "transition-colors duration-150 hover:border-ink-300",
          "focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
          error ? "border-danger-500 focus:border-danger-500 focus:ring-danger-500/20" : null,
          className,
        )}
        {...props}
      />
      {error ? (
        <p role="alert" className="text-xs text-danger-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, description, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <input
        type="checkbox"
        id={id ?? props.name}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-ink-300 text-brand-600 accent-brand-600 focus:ring-brand-500/30"
        {...props}
      />
      <label htmlFor={id ?? props.name} className="text-sm text-ink-700">
        <span className="font-medium">{label}</span>
        {description && <span className="block text-xs text-ink-400">{description}</span>}
      </label>
    </div>
  );
}
