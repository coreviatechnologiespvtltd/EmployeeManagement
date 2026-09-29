import { z } from "zod";

export const announcementSchema = z
  .object({
    title: z.string().trim().min(5, "Title must be at least 5 characters.").max(120, "Title is too long."),
    description: z
      .string()
      .trim()
      .min(15, "Short description must be at least 15 characters.")
      .max(240, "Short description must be 240 characters or fewer."),
    body: z.string().trim().min(30, "Announcement body must be at least 30 characters."),
    priority: z.enum(["low", "normal", "high", "urgent"]),
    status: z.enum(["published", "draft", "archived"]),
    publishedAt: z.string().min(1, "Published date is required."),
    expiresAt: z.string().optional(),
  })
  .refine((data) => !data.expiresAt || data.expiresAt >= data.publishedAt.slice(0, 10), {
    message: "Expiration date must be after the published date.",
    path: ["expiresAt"],
  });

export type AnnouncementInput = z.infer<typeof announcementSchema>;
