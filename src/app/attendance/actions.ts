"use server";

import { revalidatePath } from "next/cache";
import { requireActionRole } from "@/lib/auth/actions";
import { checkInToday, checkOutToday } from "@/lib/api/attendance";
import { formatTime } from "@/lib/format";
import type { ActionResult } from "@/types/common";

/**
 * Clocking in and out, for both portals.
 *
 * The mutations live here rather than in `app/employee/actions.ts` or
 * `app/admin/actions.ts` because they are the same action for both roles: an
 * admin's own attendance page and an employee's behave identically. The role is
 * resolved from the session inside `requireActionRole`, never from the caller,
 * so a page cannot ask for someone else's day.
 */

/** Every screen whose figures move when someone's day changes. */
function revalidateAttendance() {
  revalidatePath("/employee/attendance");
  revalidatePath("/employee/dashboard");
  revalidatePath("/admin/attendance");
  revalidatePath("/admin/attendance/management");
  revalidatePath("/admin/dashboard");
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to record your attendance.";
}

export async function checkInAction(): Promise<ActionResult> {
  try {
    const actor = await requireActionRole("employee", "admin");
    const record = await checkInToday(actor);

    revalidateAttendance();
    return { success: true, message: `Checked in at ${formatTime(record.checkIn)}.` };
  } catch (error) {
    return { success: false, message: message(error) };
  }
}

export async function checkOutAction(): Promise<ActionResult> {
  try {
    const actor = await requireActionRole("employee", "admin");
    const record = await checkOutToday(actor);

    revalidateAttendance();
    return {
      success: true,
      message: `Checked out at ${formatTime(record.checkOut)}. Have a good day.`,
    };
  } catch (error) {
    return { success: false, message: message(error) };
  }
}