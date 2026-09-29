import { z } from "zod";

const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const createTaskSchema = z
  .object({
    assignedToIds: z
      .array(z.string().min(1))
      .min(1, "Select at least one employee."),
    title: z.string().trim().min(4, "Task title must be at least 4 characters."),
    description: z.string().trim().min(10, "Add a description of at least 10 characters."),
    priority: prioritySchema,
    startDate: z.string().min(1, "Start date is required."),
    dueDate: z.string().min(1, "Due date is required."),
  })
  .refine((data) => data.dueDate >= data.startDate, {
    message: "Due date must be on or after the start date.",
    path: ["dueDate"],
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed", "overdue"]),
});

export const editTaskSchema = z
  .object({
    taskId: z.string().min(1),
    title: z.string().trim().min(4, "Task title must be at least 4 characters."),
    description: z.string().trim().min(10, "Add a description of at least 10 characters."),
    priority: prioritySchema,
    dueDate: z.string().min(1, "Due date is required."),
    status: z.enum(["pending", "in_progress", "completed", "overdue"]),
  });
