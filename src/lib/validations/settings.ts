import { z } from "zod";

/**
 * Company policy the admin can change at runtime.
 *
 * These four values live in `company_settings` rather than in code, so editing
 * them is an UPDATE and not a redeploy. `workdayStart` plus `lateThresholdMinutes`
 * is what makes an arrival late — see `lib/attendance-policy`.
 */
export const companySettingsSchema = z.object({
  workdayStart: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a 24-hour time such as 10:00."),
  lateThresholdMinutes: z.coerce
    .number({ message: "Enter the grace period in minutes." })
    .int("Whole minutes only.")
    .min(0, "The grace period cannot be negative.")
    .max(240, "A grace period longer than four hours is not a threshold."),
  standardWorkingHours: z.coerce
    .number({ message: "Enter the standard day length in hours." })
    .min(1, "A working day must be at least one hour.")
    .max(24, "A working day cannot exceed 24 hours."),
  leaveAllocationDays: z.coerce
    .number({ message: "Enter the annual allocation in days." })
    .int("Whole days only.")
    .min(0, "The allocation cannot be negative.")
    .max(365, "That is more than a year of leave."),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;