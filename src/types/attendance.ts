import type { Role } from "./auth";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "late"
  | "half_day"
  | "leave";

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  /** Sign-in name, so a register can be searched by username as well as name. */
  employeeUsername: string;
  /** Admins record attendance too, so the person is identified by role. */
  employeeRole: Role;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  status: AttendanceStatus;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

/** The people an attendance register can be filtered by. */
export interface AttendancePerson {
  id: string;
  fullName: string;
  username: string;
  role: Role;
  department: string;
}

export interface MonthlyAttendanceSummary {
  month: string;
  monthLabel: string;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  totalWorkingDays: number;
  totalHours: number;
  averageHours: number;
}