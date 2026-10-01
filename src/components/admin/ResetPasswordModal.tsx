"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { useToast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/forms/FormField";
import { FormActions, FormErrorMessage, SubmitButton } from "@/components/forms/FormActions";
import { resetStaffPasswordAction } from "@/app/admin/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validations/auth";
import type { Employee } from "@/types/employee";

type Values = ResetPasswordInput;
type FormValues = z.input<typeof resetPasswordSchema>;

export function ResetPasswordModal({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmNewPassword: "" },
  });

  // Re-seed whenever a different employee is opened, following the same
  // `seededFor` pattern as `EditStaffModal`, so a previously typed password is
  // never left in the form. Only plain state is set on close, because writing
  // to react-hook-form's store during render is not safe.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (employee && seededFor !== employee.id) {
    setSeededFor(employee.id);
    setServerError(undefined);
    reset({ newPassword: "", confirmNewPassword: "" });
  }
  if (!employee && seededFor !== null) setSeededFor(null);

  const onSubmit = handleSubmit(async (values) => {
    if (!employee) return;
    setServerError(undefined);
    const result = await resetStaffPasswordAction(employee.id, values);

    if (result.success) {
      toast(result.message, "success");
      onClose();
      return;
    }

    if (result.fieldErrors) {
      for (const [field, messages] of Object.entries(result.fieldErrors)) {
        if (messages?.[0]) setError(field as keyof FormValues, { message: messages[0] });
      }
    }
    setServerError(result.message);
    toast(result.message, "error");
  });

  return (
    <Modal
      open={employee !== null}
      onClose={onClose}
      title="Reset Password"
      description={
        employee
          ? `Set a new password for ${employee.fullName}. There is no email delivery in this system, so share it with them directly.`
          : undefined
      }
      size="md"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="reset-password-form" isLoading={isSubmitting} loadingText="Resetting…">
            Reset Password
          </Button>
        </FormActions>
      }
    >
      <form id="reset-password-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <div className="rounded-lg border border-warning-500/30 bg-warning-50 px-3.5 py-2.5 text-sm text-warning-700">
          They will be signed out on every device and any account lockout will be cleared.
        </div>

        <FormField
          label="New Password"
          htmlFor="reset-password"
          error={errors.newPassword?.message}
          hint="At least 8 characters with upper case, lower case and a number."
          required
        >
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
        </FormField>

        <FormField label="Confirm Password" htmlFor="reset-confirm-password" error={errors.confirmNewPassword?.message} required>
          <PasswordInput
            id="reset-confirm-password"
            autoComplete="new-password"
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword")}
          />
        </FormField>

        <SubmitButton className="sr-only" loadingText="Resetting…">
          Reset
        </SubmitButton>
      </form>
    </Modal>
  );
}
