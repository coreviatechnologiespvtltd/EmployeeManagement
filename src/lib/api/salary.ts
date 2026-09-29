import "server-only";
import { db, nextId } from "@/lib/db/store";
import { requireActionRole } from "@/lib/auth/actions";
import { simulateLatency } from "./latency";
import { currentMonth, monthLabel } from "@/lib/format";
import type { Allowance, Deduction, MonthlyEarnings, PaymentStatus, SalaryRecord } from "@/types/salary";

export interface SalaryFilters {
  query?: string;
  month?: string;
  department?: string;
  paymentStatus?: PaymentStatus | "all";
}

export function calculateNetSalary(input: {
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
}): number {
  return (
    Math.max(0, Number(input.basicSalary)) +
    Math.max(0, Number(input.allowances)) +
    Math.max(0, Number(input.bonus)) -
    Math.max(0, Number(input.deductions))
  );
}

export async function listSalaryForEmployee(employeeId: string): Promise<SalaryRecord[]> {
  await simulateLatency(180);
  return db.salaries
    .filter((s) => s.employeeId === employeeId)
    .sort((a, b) => (a.month < b.month ? 1 : -1));
}

export async function getSalaryForMonth(
  employeeId: string,
  month: string = currentMonth(),
): Promise<SalaryRecord | null> {
  await simulateLatency(110);
  return db.salaries.find((s) => s.employeeId === employeeId && s.month === month) ?? null;
}

export async function listAllSalaries(filters: SalaryFilters = {}): Promise<SalaryRecord[]> {
  await simulateLatency(220);
  let result = [...db.salaries];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((s) => [s.employeeName, s.employeeId, s.department].join(" ").toLowerCase().includes(q));
  }
  if (filters.month && filters.month !== "all") {
    result = result.filter((s) => s.month === filters.month);
  }
  if (filters.department && filters.department !== "all") {
    result = result.filter((s) => s.department === filters.department);
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    result = result.filter((s) => s.paymentStatus === filters.paymentStatus);
  }

  return result.sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

export async function getPayrollTotals(month: string = currentMonth()) {
  const records = await listAllSalaries({ month });
  return {
    month,
    monthLabel: monthLabel(month),
    employees: records.length,
    gross: records.reduce((sum, r) => sum + r.basicSalary + r.allowances + r.bonus, 0),
    deductions: records.reduce((sum, r) => sum + r.deductions, 0),
    net: records.reduce((sum, r) => sum + r.netSalary, 0),
    paid: records.filter((r) => r.paymentStatus === "paid").length,
    pending: records.filter((r) => r.paymentStatus !== "paid").length,
  };
}

export async function getAvailableMonths(): Promise<string[]> {
  await simulateLatency(60);
  return Array.from(new Set(db.salaries.map((s) => s.month))).sort().reverse();
}

export async function getEarningsSummary(employeeId: string) {
  const records = await listSalaryForEmployee(employeeId);
  const current = records.find((r) => r.month === currentMonth()) ?? null;
  const previous = records.find((r) => r.month < currentMonth()) ?? null;
  const total = records.reduce((sum, r) => sum + r.netSalary, 0);
  const bonus = records.reduce((sum, r) => sum + r.bonus, 0);

  return { total, current, previous, bonus, records };
}

export async function getEarningsSeries(employeeId: string, months: number): Promise<MonthlyEarnings[]> {
  await simulateLatency(180);
  const now = new Date();
  const out: MonthlyEarnings[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const record = db.salaries.find((s) => s.employeeId === employeeId && s.month === key);
    out.push({
      month: key,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d),
      basic: record?.basicSalary ?? 0,
      allowances: record?.allowances ?? 0,
      bonus: record?.bonus ?? 0,
      incentives: 0,
      other: 0,
      deductions: record?.deductions ?? 0,
      net: record?.netSalary ?? 0,
    });
  }
  return out;
}

export interface UpsertSalaryInput {
  employeeId: string;
  month: string;
  basicSalary: number;
  allowances: number;
  bonus: number;
  deductions: number;
  paymentStatus: PaymentStatus;
  remarks?: string;
}

export async function upsertSalary(input: UpsertSalaryInput): Promise<SalaryRecord | null> {
  await requireActionRole("admin");
  await simulateLatency(360);

  const employee = db.employees.find((e) => e.id === input.employeeId);
  if (!employee) return null;

  const existing = db.salaries.find((s) => s.employeeId === input.employeeId && s.month === input.month);
  const netSalary = calculateNetSalary(input);

  if (existing) {
    Object.assign(existing, {
      basicSalary: Number(input.basicSalary),
      allowances: Number(input.allowances),
      bonus: Number(input.bonus),
      deductions: Number(input.deductions),
      netSalary,
      paymentStatus: input.paymentStatus,
      remarks: input.remarks?.trim() || undefined,
    });
    return existing;
  }

  const record: SalaryRecord = {
    id: nextId("sal"),
    employeeId: employee.id,
    employeeName: employee.fullName,
    department: employee.department,
    month: input.month,
    basicSalary: Number(input.basicSalary),
    allowances: Number(input.allowances),
    bonus: Number(input.bonus),
    deductions: Number(input.deductions),
    netSalary,
    paymentStatus: input.paymentStatus,
    remarks: input.remarks?.trim() || undefined,
  };

  db.salaries.push(record);
  return record;
}

export async function markSalaryPaid(recordId: string): Promise<SalaryRecord | null> {
  await requireActionRole("admin");
  await simulateLatency(260);
  const record = db.salaries.find((s) => s.id === recordId);
  if (!record) return null;
  record.paymentStatus = "paid";
  record.paidAt = new Date().toISOString();
  return record;
}

export async function getSalaryHistoryForEmployee(employeeId: string): Promise<SalaryRecord[]> {
  return listSalaryForEmployee(employeeId);
}

export const ALLOWANCE_TEMPLATES: Allowance[] = [
  { id: "a1", label: "Household Allowance", amount: 6000 },
  { id: "a2", label: "Transport Allowance", amount: 2500 },
  { id: "a3", label: "Medical Allowance", amount: 2000 },
  { id: "a4", label: "Internet Allowance", amount: 1500 },
];

export const DEDUCTION_TEMPLATES: Deduction[] = [
  { id: "d1", label: "Provident Fund (10%)", amount: 4000 },
  { id: "d2", label: "TDS", amount: 1500 },
  { id: "d3", label: "Absence Deduction", amount: 1200 },
  { id: "d4", label: "Provident Library Fund", amount: 500 },
];
