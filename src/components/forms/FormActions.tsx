"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import type { ButtonProps } from "@/components/ui/Button";

/** Submit button wired to the enclosing form's pending state. */
export function SubmitButton({
  children,
  loadingText = "Saving…",
  ...props
}: ButtonProps & { children: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" isLoading={pending} loadingText={loadingText} disabled={pending} {...props}>
      {children}
    </Button>
  );
}

export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 pt-4">{children}</div>;
}

export function FormErrorMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-700"
    >
      {message}
    </p>
  );
}
