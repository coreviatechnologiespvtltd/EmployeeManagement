export type LeaveType =
  | "casual"
  | "sick"
  | "annual"
  | "unpaid"
  | "maternity";

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  appliedAt: string;
  status: LeaveStatus;
  adminComment?: string;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface LeaveBalance {
  total: number;
  used: number;
  pending: number;
  remaining: number;
}
