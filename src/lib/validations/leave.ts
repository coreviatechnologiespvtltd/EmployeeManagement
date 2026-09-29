import { z } from "zod";

export const submitLeaveSchema = z
  .object({
    leaveType: z.enum(["casual", "sick", "annual", "unpaid", "maternity"], {
      message: "Select a leave type.",
    }),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    reason: z
      .string()
      .trim()
      .min(10, "Please describe the reason in at least 10 characters.")
      .max(500, "Reason must be 500 characters or fewer."),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

export type SubmitLeaveInput = z.infer<typeof submitLeaveSchema>;

export const decideLeaveSchema = z.object({
  leaveId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  comment: z.string().trim().max(300, "Comment must be 300 characters or fewer.").optional(),
});

export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;
