import type { AttendanceRecord, MonthlyAttendanceSummary } from "@/types/attendance";
import { seedEmployees } from "./employees";
import { LATE_THRESHOLD_MINUTES, STANDARD_WORKING_HOURS } from "@/lib/constants";
import { makeRandom, monthKey, shiftDays, shiftMonths, toISODate, toISODateTime, todayDate } from "./date-utils";
import type { LeaveRequest } from "@/types/leave";

const random = makeRandom(20260929);
const today = todayDate();

const activeEmployees = seedEmployees.filter((e) => e.status === "active");

function buildAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  // 90 days back, 3 months forward (covers current + next month payroll view)
  for (let offset = -90; offset <= 3; offset++) {
    const day = shiftDays(today, offset);
    const weekday = day.getDay();
    const isSunday = weekday === 0;
    const isSaturday = weekday === 6;
    const date = toISODate(day);

    for (const emp of activeEmployees) {
      // Deterministic per-employee attendance character
      const empRoll = random();
      const roll = (emp.id.charCodeAt(5) * 7 + offset * 13) % 100 / 100;
      const score = (empRoll + roll) / 2;

      if (isSunday) continue;

      let status: AttendanceRecord["status"];
      if (isSaturday) {
        status = score > 0.55 ? "present" : "half_day";
      } else if (score > 0.95) {
        status = "leave";
      } else if (score > 0.86) {
        status = "absent";
      } else if (score > 0.22) {
        status = "late";
      } else {
        status = "present";
      }

      const lateMinutes =
        status === "late" ? LATE_THRESHOLD_MINUTES + Math.floor(random() * 25) : Math.floor(random() * 8);
      const earlyMinutes = Math.floor(random() * 40);
      const lateOnLeave = emp.id === "emp-1007" && offset >= -5 && offset <= -1;

      const checkInBase = new Date(day);
      checkInBase.setHours(9, 0, 0, 0);
      checkInBase.setMinutes(checkInBase.getMinutes() + lateMinutes);

      const checkOutBase = new Date(day);
      checkOutBase.setHours(17, 45, 0, 0);
      checkOutBase.setMinutes(checkOutBase.getMinutes() - earlyMinutes);

      const isWorking = status === "present" || status === "late" || status === "half_day";
      const checkIn = isWorking ? toISODateTime(checkInBase) : null;
      const checkOut = isWorking ? toISODateTime(checkOutBase) : null;
      const workingHours =
        isWorking && checkIn && checkOut
          ? Number(
              (
                (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
                3_600_000
              ).toFixed(2),
            )
          : null;

      records.push({
        id: `att-${emp.id}-${date}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        date,
        checkIn: lateOnLeave ? null : checkIn,
        checkOut: lateOnLeave ? null : checkOut,
        workingHours: lateOnLeave ? null : workingHours,
        status: lateOnLeave ? "leave" : status,
        remarks: lateOnLeave ? "Approved medical leave" : undefined,
      });
    }
  }

  // Force today's state for the two demo logins so the dashboard reads clearly
  const todayStr = toISODate(today);
  for (const record of records) {
    if (record.date !== todayStr) continue;
    if (record.employeeId === "emp-1002") {
      record.status = "present";
      record.checkIn = toISODateTime(new Date(today.getTime()));
      record.checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 2, 0).toISOString();
      record.checkOut = null;
      record.workingHours = null;
    }
    if (record.employeeId === "emp-1001") {
      record.status = "late";
      record.checkIn = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 18, 0).toISOString();
      record.checkOut = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 52, 0).toISOString();
      record.workingHours = 8.57;
    }
  }

  return records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.employeeName.localeCompare(b.employeeName)));
}

export const seedAttendance: AttendanceRecord[] = buildAttendance();

export function buildSummary(records: AttendanceRecord[], month: string): MonthlyAttendanceSummary {
  const scoped = records.filter((r) => r.date.startsWith(month));
  const count = (status: AttendanceRecord["status"]) =>
    scoped.filter((r) => r.status === status).length;
  const totalHours = scoped.reduce((sum, r) => sum + (r.workingHours ?? 0), 0);
  const hoursCount = scoped.filter((r) => r.workingHours !== null).length;
  const date = new Date(`${month}-01T00:00:00`);

  return {
    month,
    monthLabel: new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date),
    present: count("present"),
    absent: count("absent"),
    late: count("late"),
    halfDay: count("half_day"),
    leave: count("leave"),
    totalWorkingDays: scoped.length,
    totalHours: Number(totalHours.toFixed(1)),
    averageHours: hoursCount ? Number((totalHours / hoursCount).toFixed(2)) : 0,
  };
}

export const seedLeaveRequests: LeaveRequest[] = [
  {
    id: "lv-2001",
    employeeId: "emp-1002",
    employeeName: "Sushmita Adhikari",
    department: "Engineering",
    leaveType: "annual",
    startDate: toISODate(shiftDays(today, -22)),
    endDate: toISODate(shiftDays(today, -19)),
    totalDays: 4,
    reason: "Family function out of valley, travel booked and confirmed.",
    appliedAt: toISODateTime(shiftDays(today, -30)),
    status: "approved",
    adminComment: "Approved. Enjoy the break.",
    reviewedAt: toISODateTime(shiftDays(today, -29)),
    reviewedByName: "Aarav Shrestha",
  },
  {
    id: "lv-2002",
    employeeId: "emp-1003",
    employeeName: "Bikash Thapa",
    department: "Engineering",
    leaveType: "sick",
    startDate: toISODate(shiftDays(today, -4)),
    endDate: toISODate(shiftDays(today, -3)),
    totalDays: 2,
    reason: "Viral fever, advised rest by the doctor.",
    appliedAt: toISODateTime(shiftDays(today, -5)),
    status: "approved",
    adminComment: "Take care. Get well soon.",
    reviewedAt: toISODateTime(shiftDays(today, -5)),
    reviewedByName: "Aarav Shrestha",
  },
  {
    id: "lv-2003",
    employeeId: "emp-1004",
    employeeName: "Nisha Gurung",
    department: "Human Resources",
    leaveType: "casual",
    startDate: toISODate(shiftDays(today, 6)),
    endDate: toISODate(shiftDays(today, 7)),
    totalDays: 2,
    reason: "Personal paperwork at the district office.",
    appliedAt: toISODateTime(shiftDays(today, -1)),
    status: "pending",
  },
  {
    id: "lv-2004",
    employeeId: "emp-1006",
    employeeName: "Pratiksha Karki",
    department: "Sales",
    leaveType: "annual",
    startDate: toISODate(shiftDays(today, 14)),
    endDate: toISODate(shiftDays(today, 20)),
    totalDays: 7,
    reason: "Annual vacation to Pokhara with family.",
    appliedAt: toISODateTime(shiftDays(today, -2)),
    status: "pending",
  },
  {
    id: "lv-2005",
    employeeId: "emp-1008",
    employeeName: "Manisha Rai",
    department: "Marketing",
    leaveType: "unpaid",
    startDate: toISODate(shiftDays(today, -12)),
    endDate: toISODate(shiftDays(today, -11)),
    totalDays: 2,
    reason: "Needed to handle urgent property registration.",
    appliedAt: toISODateTime(shiftDays(today, -16)),
    status: "rejected",
    adminComment: "Campaign launch week. Please reschedule for next month.",
    reviewedAt: toISODateTime(shiftDays(today, -15)),
    reviewedByName: "Aarav Shrestha",
  },
  {
    id: "lv-2006",
    employeeId: "emp-1009",
    employeeName: "Sanjay Tamang",
    department: "Customer Support",
    leaveType: "casual",
    startDate: toISODate(shiftDays(today, 2)),
    endDate: toISODate(shiftDays(today, 2)),
    totalDays: 1,
    reason: "Bank appointment in the afternoon.",
    appliedAt: toISODateTime(today),
    status: "pending",
  },
  {
    id: "lv-2007",
    employeeId: "emp-1010",
    employeeName: "Deepika Neupane",
    department: "Engineering",
    leaveType: "annual",
    startDate: toISODate(shiftMonths(today, -1)),
    endDate: toISODate(shiftDays(shiftMonths(today, -1), 2)),
    totalDays: 3,
    reason: "Pre-planned leave, handover documented in the tracker.",
    appliedAt: toISODateTime(shiftDays(today, -40)),
    status: "approved",
    adminComment: "Approved, handover notes are complete.",
    reviewedAt: toISODateTime(shiftDays(today, -38)),
    reviewedByName: "Aarav Shrestha",
  },
  {
    id: "lv-2008",
    employeeId: "emp-1005",
    employeeName: "Rajesh Maharjan",
    department: "Finance",
    leaveType: "sick",
    startDate: toISODate(shiftDays(today, -1)),
    endDate: toISODate(shiftDays(today, -1)),
    totalDays: 1,
    reason: "Migraine, unable to work.",
    appliedAt: toISODateTime(shiftDays(today, -1)),
    status: "pending",
  },
];

export const CURRENT_MONTH = monthKey(today);
export const PREVIOUS_MONTH = monthKey(shiftMonths(today, -1));
export const MONTHS_BEFORE = [2, 3, 4, 5, 6, 7, 8].map((n) => monthKey(shiftMonths(today, -n)));
export const STANDARD_HOURS = STANDARD_WORKING_HOURS;
