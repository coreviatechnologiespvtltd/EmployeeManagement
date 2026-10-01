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
import { changePasswordAction } from "@/lib/auth/actions";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/auth";

// The current password never leaves this component's inputs — it goes straight
// to the server action, is compared against the bcrypt hash in PostgreSQL, and
// is not stored anywhere.

type Values = ChangePasswordInput;
type FormValues = z.input<typeof changePasswordSchema>;

export function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, Values>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  // Re-seed whenever the dialog is (re)opened, following the same
  // `seededFor` pattern as `EditStaffModal`, so a password is never left in the
  // form after it is dismissed. Resetting on close instead would write to
  // react-hook-form's store during render.
  const [seededFor, setSeededFor] = useState(false);
  if (open && !seededFor) {
    setSeededFor(true);
    reset({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    setServerError(undefined);
  }
  if (!open && seededFor) setSeededFor(false);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    const result = await changePasswordAction(values);

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
      open={open}
      onClose={onClose}
      title="Change Password"
      description="Use a password you do not use anywhere else. You will stay signed in here, and any other device will be signed out."
      size="md"
      footer={
        <FormActions>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" isLoading={isSubmitting} loadingText="Updating…">
            Update Password
          </Button>
        </FormActions>
      }
    >
      <form id="change-password-form" onSubmit={onSubmit} className="space-y-5" noValidate>
        <FormErrorMessage message={serverError} />

        <FormField label="Current Password" htmlFor="current-password" error={errors.currentPassword?.message} required>
          <PasswordInput
            id="current-password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />
        </FormField>

        <FormField
          label="New Password"
          htmlFor="new-password"
          error={errors.newPassword?.message}
          hint="At least 8 characters with upper case, lower case and a number."
          required
        >
          <PasswordInput
            id="new-password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />
        </FormField>

        <FormField label="Confirm New Password" htmlFor="confirm-password" error={errors.confirmNewPassword?.message} required>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            error={errors.confirmNewPassword?.message}
            {...register("confirmNewPassword")}
          />
        </FormField>

        <SubmitButton className="sr-only" loadingText="Updating…">
          Update
        </SubmitButton>
      </form>
    </Modal>
  );
}
