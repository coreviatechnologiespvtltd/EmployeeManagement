"use server";

import { revalidatePath } from "next/cache";
import { requireActionRole } from "@/lib/auth/actions";
import {
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee,
} from "@/lib/api/employees";
import { createTasks, updateTaskFromAdmin, deleteTask } from "@/lib/api/tasks";
import { decideLeave } from "@/lib/api/leaves";
import { upsertSalary, markSalaryPaid } from "@/lib/api/salary";
import { correctAttendance } from "@/lib/api/attendance";
import {
  createAnnouncement,
  updateAnnouncement,
  setAnnouncementStatus,
  deleteAnnouncement,
} from "@/lib/api/announcements";
import { registerStaffSchema, editStaffSchema } from "@/lib/validations/employee";
import { createTaskSchema, editTaskSchema } from "@/lib/validations/task";
import { announcementSchema } from "@/lib/validations/announcement";
import { salaryRecordSchema, attendanceCorrectionSchema } from "@/lib/validations/salary";
import { monthLabel } from "@/lib/format";
import type { ActionResult } from "@/types/common";
import type { AnnouncementInput } from "@/lib/api/announcements";
import type { UpsertSalaryInput } from "@/lib/api/salary";
import type { CreateEmployeeInput } from "@/lib/api/employees";
import type { CreateTaskInput } from "@/lib/api/tasks";

type AdminTaskPatch = Parameters<typeof updateTaskFromAdmin>[1];

function fieldErrors(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }) {
  return error.flatten().fieldErrors as Record<string, string[]>;
}

function revalidateAdmin() {
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/staff");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/leaves");
  revalidatePath("/admin/salary");
  revalidatePath("/admin/attendance");
  revalidatePath("/employee/dashboard");
  revalidatePath("/employee/notices");
  revalidatePath("/employee/todo");
  revalidatePath("/employee/leaves");
}

/* ------------------------------- Staff ------------------------------- */

export async function registerStaffAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = registerStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const { confirmPassword: _confirmPassword, ...data } = parsed.data;

  try {
    const employee = await createEmployee(data as CreateEmployeeInput);
    revalidateAdmin();
    return { success: true, message: `${employee.fullName} registered successfully.`, data: { id: employee.id } };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Unable to register staff." };
  }
}

export async function updateStaffAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = editStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const employee = await updateEmployee(id, parsed.data);
  if (!employee) return { success: false, message: "Staff member not found." };

  revalidateAdmin();
  return { success: true, message: `${employee.fullName} updated successfully.` };
}

export async function setStaffStatusAction(id: string, status: "active" | "inactive"): Promise<ActionResult> {
  await requireActionRole("admin");
  const ok = await setEmployeeStatus(id, status);
  if (!ok) return { success: false, message: "Staff member not found." };

  revalidateAdmin();
  return { success: true, message: status === "active" ? "Staff reactivated." : "Staff deactivated." };
}

export async function deleteStaffAction(id: string): Promise<ActionResult> {
  const actor = await requireActionRole("admin");
  const ok = await deleteEmployee(id, actor);
  if (!ok) return { success: false, message: "Unable to remove this staff member." };

  revalidateAdmin();
  return { success: true, message: "Staff member removed." };
}

/* -------------------------------- Tasks -------------------------------- */

export async function createTasksAction(input: unknown): Promise<ActionResult> {
  const parsed = createTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const admin = await requireActionRole("admin");
  const created = await createTasks(parsed.data as CreateTaskInput, admin.id);

  revalidateAdmin();
  return {
    success: true,
    message: `Task assigned to ${created} staff member${created === 1 ? "" : "s"}.`,
  };
}

export async function updateTaskFromAdminAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = editTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const { taskId: _taskId, ...patch } = parsed.data;
  const task = await updateTaskFromAdmin(id, patch as AdminTaskPatch);
  if (!task) return { success: false, message: "Task not found." };

  revalidateAdmin();
  return { success: true, message: "Task updated." };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  await requireActionRole("admin");
  const ok = await deleteTask(id);
  if (!ok) return { success: false, message: "Task not found." };

  revalidateAdmin();
  return { success: true, message: "Task deleted." };
}

/* -------------------------------- Leaves ------------------------------- */

export async function decideLeaveAction(
  id: string,
  decision: "approved" | "rejected",
  comment?: string,
): Promise<ActionResult> {
  const admin = await requireActionRole("admin");
  const leave = await decideLeave(id, decision, comment ?? "", admin);
  if (!leave) return { success: false, message: "Leave request not found." };

  revalidateAdmin();
  return { success: true, message: `Leave request ${decision}.` };
}

/* -------------------------------- Salary ------------------------------- */

export async function upsertSalaryAction(input: unknown): Promise<ActionResult<{ net: number }>> {
  const parsed = salaryRecordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const record = await upsertSalary(parsed.data as UpsertSalaryInput);
  if (!record) return { success: false, message: "Employee not found." };

  revalidateAdmin();
  return {
    success: true,
    message: `Salary saved for ${monthLabel(record.month)}.`,
    data: { net: record.netSalary },
  };
}

export async function markSalaryPaidAction(id: string): Promise<ActionResult> {
  await requireActionRole("admin");
  const record = await markSalaryPaid(id);
  if (!record) return { success: false, message: "Salary record not found." };

  revalidateAdmin();
  return { success: true, message: "Salary marked as paid." };
}

/* ----------------------------- Announcements ---------------------------- */

export async function createAnnouncementAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  const admin = await requireActionRole("admin");
  const announcement = await createAnnouncement(parsed.data as AnnouncementInput, admin);

  revalidateAdmin();
  return { success: true, message: `Announcement "${announcement.title}" saved.`, data: { id: announcement.id } };
}

export async function updateAnnouncementAction(id: string, input: unknown): Promise<ActionResult> {
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const announcement = await updateAnnouncement(id, parsed.data as AnnouncementInput);
  if (!announcement) return { success: false, message: "Announcement not found." };

  revalidateAdmin();
  return { success: true, message: "Announcement updated." };
}

export async function setAnnouncementStatusAction(id: string, status: "published" | "draft" | "archived"): Promise<ActionResult> {
  await requireActionRole("admin");
  const announcement = await setAnnouncementStatus(id, status);
  if (!announcement) return { success: false, message: "Announcement not found." };

  revalidateAdmin();
  return { success: true, message: `Announcement marked as ${status}.` };
}

export async function deleteAnnouncementAction(id: string): Promise<ActionResult> {
  await requireActionRole("admin");
  const ok = await deleteAnnouncement(id);
  if (!ok) return { success: false, message: "Announcement not found." };

  revalidateAdmin();
  return { success: true, message: "Announcement deleted." };
}

/* ------------------------------ Attendance ----------------------------- */

export async function correctAttendanceAction(input: unknown): Promise<ActionResult> {
  const parsed = attendanceCorrectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Please correct the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  }

  await requireActionRole("admin");
  const record = await correctAttendance({
    recordId: parsed.data.recordId,
    status: parsed.data.status,
    checkIn: parsed.data.checkIn ?? null,
    checkOut: parsed.data.checkOut ?? null,
    remarks: parsed.data.remarks,
  });
  if (!record) return { success: false, message: "Attendance record not found for that date." };

  revalidateAdmin();
  return { success: true, message: `Attendance corrected for ${record.employeeName}.` };
}
