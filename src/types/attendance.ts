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
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number | null;
  status: AttendanceStatus;
  remarks?: string;
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
