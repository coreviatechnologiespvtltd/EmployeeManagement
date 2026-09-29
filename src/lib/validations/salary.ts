import { z } from "zod";

const positiveAmount = (label: string) =>
  z.coerce
    .number({ message: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} looks too large.`);

export const salaryRecordSchema = z
  .object({
    employeeId: z.string().min(1, "Select an employee."),
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Choose a valid month."),
    basicSalary: positiveAmount("Basic salary"),
    allowances: positiveAmount("Allowances"),
    bonus: positiveAmount("Bonus"),
    deductions: positiveAmount("Deductions"),
    paymentStatus: z.enum(["paid", "pending", "processing"]),
    remarks: z.string().trim().max(200, "Remarks must be 200 characters or fewer.").optional(),
  })
  .refine((data) => data.basicSalary > 0, {
    message: "Basic salary must be greater than zero.",
    path: ["basicSalary"],
  });

export type SalaryRecordInput = z.infer<typeof salaryRecordSchema>;

export const attendanceCorrectionSchema = z
  .object({
    recordId: z.string().min(1),
    status: z.enum(["present", "absent", "late", "half_day", "leave"]),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    remarks: z.string().trim().max(200, "Remarks must be 200 characters or fewer.").optional(),
  })
  .refine(
    (data) => !data.checkIn || !data.checkOut || data.checkOut >= data.checkIn,
    { message: "Check-out time must be after check-in time.", path: ["checkOut"] },
  );

export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;
