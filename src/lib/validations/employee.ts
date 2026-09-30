import { z } from "zod";
import { POSITIONS } from "@/lib/constants";

const roleSchema = z.enum(["employee", "admin"]);

// Departments now live in the `departments` table, so membership is validated
// by the database rather than by a hardcoded array. The check below is only a
// fast, friendly form-level guard; `createEmployee` rejects unknown values too.
// Positions remain a closed set because they are titles rather than records.
const departmentSchema = z.string().trim().min(1, "Select a department.");
const positionSchema = z.enum(POSITIONS, { message: "Select a position." });

export const registerStaffSchema = z
  .object({
    fullName: z.string().trim().min(3, "Full name must be at least 3 characters."),
    username: z
      .string()
      .trim()
      .min(3, "Username must be at least 3 characters.")
      .max(32, "Username must be 32 characters or fewer.")
      .regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dots, dashes or underscores only."),
    email: z.string().trim().email("Enter a valid email address."),
    phone: z
      .string()
      .trim()
      .min(7, "Enter a valid phone number.")
      .max(20, "Phone number is too long."),
    address: z.string().trim().min(5, "Enter a full address."),
    department: departmentSchema,
    position: positionSchema,
    joiningDate: z.string().min(1, "Joining date is required."),
    basicSalary: z.coerce
      .number({ message: "Enter a valid amount." })
      .min(0, "Salary cannot be negative.")
      .max(10_000_000, "Salary looks too large."),
    role: roleSchema,
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .regex(/[A-Z]/, "Include at least one uppercase letter.")
      .regex(/[a-z]/, "Include at least one lowercase letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirmPassword: z.string().min(1, "Please confirm the password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterStaffInput = z.infer<typeof registerStaffSchema>;

export const editStaffSchema = z.object({
  fullName: z.string().trim().min(3, "Full name must be at least 3 characters."),
  email: z.string().trim().email("Enter a valid email address."),
  phone: z.string().trim().min(7, "Enter a valid phone number."),
  address: z.string().trim().min(5, "Enter a full address."),
  department: departmentSchema,
  position: positionSchema,
  joiningDate: z.string().min(1, "Joining date is required."),
  basicSalary: z.coerce.number().min(0, "Salary cannot be negative."),
  role: roleSchema,
});

export type EditStaffInput = z.infer<typeof editStaffSchema>;
