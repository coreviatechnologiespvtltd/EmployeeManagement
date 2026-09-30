import "server-only";

import { and, asc, count, desc, eq, ilike, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { salarySelection } from "@/lib/db/selects";
import { likePattern } from "@/lib/db/query-helpers";
import { departments, employees, salaryComponentTemplates, salaryRecords } from "@/lib/db/schema";
import { toMonthKey, toMonthStart, toNumber, toSalaryRecord } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { currentMonth, monthLabel } from "@/lib/format";
import type {
  Allowance,
  Deduction,
  MonthlyEarnings,
  PaymentStatus,
  SalaryRecord,
} from "@/types/salary";

export interface SalaryFilters {
  query?: string;
  month?: string;
  department?: string;
  paymentStatus?: PaymentStatus | "all";
}

const searchBlob = sql`concat_ws(' ', ${employees.fullName}, ${employees.id}, ${departments.name})`;

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
  const rows = await db
    .select(salarySelection)
    .from(salaryRecords)
    .innerJoin(employees, eq(salaryRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(salaryRecords.employeeId, employeeId))
    .orderBy(desc(salaryRecords.month));

  return rows.map(toSalaryRecord);
}

export async function getSalaryForMonth(
  employeeId: string,
  month: string = currentMonth(),
): Promise<SalaryRecord | null> {
  const rows = await db
    .select(salarySelection)
    .from(salaryRecords)
    .innerJoin(employees, eq(salaryRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(eq(salaryRecords.employeeId, employeeId), eq(salaryRecords.month, toMonthStart(month))))
    .limit(1);

  const row = rows[0];
  return row ? toSalaryRecord(row) : null;
}

function buildFilters(filters: SalaryFilters) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.month && filters.month !== "all") {
    conditions.push(eq(salaryRecords.month, toMonthStart(filters.month)));
  }
  if (filters.department && filters.department !== "all") {
    conditions.push(eq(departments.name, filters.department));
  }
  if (filters.paymentStatus && filters.paymentStatus !== "all") {
    conditions.push(eq(salaryRecords.paymentStatus, filters.paymentStatus));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listAllSalaries(filters: SalaryFilters = {}): Promise<SalaryRecord[]> {
  const rows = await db
    .select(salarySelection)
    .from(salaryRecords)
    .innerJoin(employees, eq(salaryRecords.employeeId, employees.id))
    .innerJoin(departments, eq(employees.departmentId, departments.id))
    .where(buildFilters(filters))
    .orderBy(asc(employees.fullName), desc(salaryRecords.month));

  return rows.map(toSalaryRecord);
}

export async function getPayrollTotals(month: string = currentMonth()) {
  const rows = await db
    .select({
      employees: count(),
      gross: sql<string>`coalesce(sum(${salaryRecords.basicSalary} + ${salaryRecords.allowances} + ${salaryRecords.bonus}), 0)`,
      deductions: sql<string>`coalesce(sum(${salaryRecords.deductions}), 0)`,
      net: sql<string>`coalesce(sum(${salaryRecords.netSalary}), 0)`,
      paid: sql<number>`count(*) filter (where ${salaryRecords.paymentStatus} = 'paid')`,
    })
    .from(salaryRecords)
    .where(eq(salaryRecords.month, toMonthStart(month)));

  const row = rows[0];
  const employees_ = toNumber(row?.employees);

  return {
    month,
    monthLabel: monthLabel(month),
    employees: employees_,
    gross: toNumber(row?.gross),
    deductions: toNumber(row?.deductions),
    net: toNumber(row?.net),
    paid: toNumber(row?.paid),
    pending: employees_ - toNumber(row?.paid),
  };
}

export async function getAvailableMonths(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ month: salaryRecords.month })
    .from(salaryRecords)
    .orderBy(desc(salaryRecords.month));

  return rows.map((row) => toMonthKey(row.month));
}

export async function getEarningsSummary(employeeId: string) {
  const records = await listSalaryForEmployee(employeeId);
  const thisMonth = currentMonth();

  const current = records.find((record) => record.month === thisMonth) ?? null;
  const previous = records.find((record) => record.month < thisMonth) ?? null;

  return {
    total: records.reduce((sum, record) => sum + record.netSalary, 0),
    current,
    previous,
    bonus: records.reduce((sum, record) => sum + record.bonus, 0),
    records,
  };
}

/** The last `months` months, zero-filled where an employee has no payslip. */
export async function getEarningsSeries(employeeId: string, months: number): Promise<MonthlyEarnings[]> {
  const now = new Date();
  const out: MonthlyEarnings[] = [];

  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const start = toMonthStart(keys[0]!);

  const rows = await db
    .select({
      month: salaryRecords.month,
      basicSalary: salaryRecords.basicSalary,
      allowances: salaryRecords.allowances,
      bonus: salaryRecords.bonus,
      deductions: salaryRecords.deductions,
      netSalary: salaryRecords.netSalary,
    })
    .from(salaryRecords)
    .where(and(eq(salaryRecords.employeeId, employeeId), sql`${salaryRecords.month} >= ${start}`))
    .orderBy(asc(salaryRecords.month));

  const byMonth = new Map(rows.map((row) => [toMonthKey(row.month), row]));

  for (const key of keys) {
    const d = new Date(`${key}-01T00:00:00`);
    const record = byMonth.get(key);
    out.push({
      month: key,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(d),
      basic: toNumber(record?.basicSalary),
      allowances: toNumber(record?.allowances),
      bonus: toNumber(record?.bonus),
      incentives: 0,
      other: 0,
      deductions: toNumber(record?.deductions),
      net: toNumber(record?.netSalary),
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

  const employeeRows = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, input.employeeId))
    .limit(1);

  if (employeeRows.length === 0) return null;

  const netSalary = calculateNetSalary(input);
  const month = toMonthStart(input.month);

  const values = {
    basicSalary: String(Number(input.basicSalary) || 0),
    allowances: String(Number(input.allowances) || 0),
    bonus: String(Number(input.bonus) || 0),
    deductions: String(Number(input.deductions) || 0),
    netSalary: String(netSalary),
    paymentStatus: input.paymentStatus,
    remarks: input.remarks?.trim() || null,
    updatedAt: new Date().toISOString(),
  };

  // `unique (employee_id, month)` turns this into a real upsert, so the same
  // code path creates a payslip and corrects an existing one.
  await db
    .insert(salaryRecords)
    .values({ ...values, employeeId: input.employeeId, month })
    .onConflictDoUpdate({
      target: [salaryRecords.employeeId, salaryRecords.month],
      set: values,
    });

  return getSalaryForMonth(input.employeeId, input.month);
}

export async function markSalaryPaid(recordId: string): Promise<SalaryRecord | null> {
  await requireActionRole("admin");

  const updated = await db
    .update(salaryRecords)
    .set({
      paymentStatus: "paid",
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(salaryRecords.id, recordId))
    .returning({ id: salaryRecords.id, employeeId: salaryRecords.employeeId, month: salaryRecords.month });

  const row = updated[0];
  if (!row) return null;

  return getSalaryForMonth(row.employeeId, toMonthKey(row.month));
}

export async function getSalaryHistoryForEmployee(employeeId: string): Promise<SalaryRecord[]> {
  return listSalaryForEmployee(employeeId);
}

/**
 * Allowance and deduction presets, previously two hardcoded arrays in this
 * file. They now live in `salary_component_templates`.
 */
export async function listSalaryComponentTemplates(): Promise<{
  allowances: Allowance[];
  deductions: Deduction[];
}> {
  const rows = await db
    .select({
      id: salaryComponentTemplates.id,
      kind: salaryComponentTemplates.kind,
      label: salaryComponentTemplates.label,
      amount: salaryComponentTemplates.amount,
      sortOrder: salaryComponentTemplates.sortOrder,
    })
    .from(salaryComponentTemplates)
    .orderBy(asc(salaryComponentTemplates.sortOrder), asc(salaryComponentTemplates.label));

  return {
    allowances: rows
      .filter((row) => row.kind === "allowance")
      .map((row) => ({ id: row.id, label: row.label, amount: toNumber(row.amount) })),
    deductions: rows
      .filter((row) => row.kind === "deduction")
      .map((row) => ({ id: row.id, label: row.label, amount: toNumber(row.amount) })),
  };
}
