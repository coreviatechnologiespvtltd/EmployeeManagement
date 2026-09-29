"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./Input";
import type { InputProps } from "./Input";

export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(
  function PasswordInput({ label, error, hint, id, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const fieldId = id ?? props.name;

    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={fieldId} className="block text-sm font-medium text-ink-700">
            {label}
            {props.required && (
              <span aria-hidden className="ml-0.5 text-danger-600">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            className="pr-11"
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-ink-400 transition-colors duration-150 hover:text-ink-700"
          >
            {visible ? <EyeOff aria-hidden className="h-4 w-4" /> : <Eye aria-hidden className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p role="alert" className="text-xs text-danger-600">
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-ink-400">{hint}</p>
        ) : null}
      </div>
    );
  },
);
