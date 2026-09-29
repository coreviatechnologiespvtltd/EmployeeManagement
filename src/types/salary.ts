export type PaymentStatus = "paid" | "pending" | "processing";

export interface SalaryRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  month: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  paymentStatus: PaymentStatus;
  paidAt?: string;
  remarks?: string;
}

export interface Allowance {
  id: string;
  label: string;
  amount: number;
}

export interface Deduction {
  id: string;
  label: string;
  amount: number;
}

export interface EarningsBreakdownItem {
  label: string;
  amount: number;
  kind: "earning" | "deduction";
}

export interface MonthlyEarnings {
  month: string;
  label: string;
  basic: number;
  allowances: number;
  bonus: number;
  incentives: number;
  other: number;
  deductions: number;
  net: number;
}
