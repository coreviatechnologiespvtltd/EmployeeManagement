"use server";

import { revalidatePath } from "next/cache";
import { requireActionRole } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/service";
import { updateTaskStatus as updateTaskStatusService } from "@/lib/api/tasks";
import { submitLeave as submitLeaveService, cancelLeave as cancelLeaveService } from "@/lib/api/leaves";
import { markNoticeRead } from "@/lib/api/announcements";
import { submitLeaveSchema } from "@/lib/validations/leave";
import { updateTaskStatusSchema } from "@/lib/validations/task";
import type { ActionResult } from "@/types/common";

export async function updateTaskStatusAction(taskId: string, status: string): Promise<ActionResult> {
  const parsed = updateTaskStatusSchema.safeParse({ taskId, status });
  if (!parsed.success) return { success: false, message: "Invalid task status." };

  const user = await requireActionRole("employee", "admin");
  const updated = await updateTaskStatusService(parsed.data.taskId, parsed.data.status, user.id, false);
  if (!updated) return { success: false, message: "You can only update tasks assigned to you." };

  revalidatePath("/employee/todo");
  revalidatePath("/employee/dashboard");
  return { success: true, message: `Task marked as ${updated.status.replace("_", " ")}.` };
}

export async function submitLeaveAction(input: unknown): Promise<ActionResult> {
  const parsed = submitLeaveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const user = await requireActionRole("employee", "admin");
  try {
    const request = await submitLeaveService(parsed.data, user);
    revalidatePath("/employee/leaves");
    revalidatePath("/employee/dashboard");
    return {
      success: true,
      message: `Leave request for ${request.totalDays} day${request.totalDays === 1 ? "" : "s"} submitted.`,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to submit the request." };
  }
}

export async function cancelLeaveAction(leaveId: string): Promise<ActionResult> {
  const user = await requireActionRole("employee", "admin");
  const cancelled = await cancelLeaveService(leaveId, user);
  if (!cancelled) return { success: false, message: "Only pending future requests can be cancelled." };

  revalidatePath("/employee/leaves");
  return { success: true, message: "Leave request cancelled." };
}

export async function markNoticeReadAction(noticeId: string): Promise<ActionResult> {
  const user = await requireActionRole("employee", "admin");
  await markNoticeRead(noticeId, user.id);
  revalidatePath("/employee/notices");
  revalidatePath("/employee/dashboard");
  return { success: true, message: "Marked as read." };
}

export async function getCurrentUserIdAction(): Promise<string | null> {
  const user = await getCurrentUser();
  return user?.id ?? null;
}
