import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Username is required.")
    .min(3, "Username must be at least 3 characters."),
  password: z
    .string()
    .min(1, "Password is required.")
    .min(6, "Password must be at least 6 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * The one password rule for the whole application.
 *
 * `registerStaffSchema` imports this so an admin-issued password and a
 * self-chosen one are held to the same standard and the rules cannot drift
 * apart. Login deliberately uses a weaker rule — a 6-character floor there
 * would only reject correct historic credentials, never grant access, so it
 * stays permissive on purpose.
 */
export const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Include at least one uppercase letter.")
  .regex(/[a-z]/, "Include at least one lowercase letter.")
  .regex(/[0-9]/, "Include at least one number.");

/** Self-service: the current password proves the session is really yours. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: strongPassword,
    confirmNewPassword: z.string().min(1, "Please confirm the new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

/** Admin-issued: no current password exists to check. */
export const resetPasswordSchema = z
  .object({
    newPassword: strongPassword,
    confirmNewPassword: z.string().min(1, "Please confirm the new password."),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match.",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
