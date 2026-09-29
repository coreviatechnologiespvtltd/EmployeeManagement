import type { SalaryRecord } from "@/types/salary";
import { seedEmployees } from "./employees";
import { makeRandom, monthKey, shiftMonths, todayDate } from "./date-utils";

const random = makeRandom(770425);
const today = todayDate();

const activeEmployees = seedEmployees.filter((e) => e.status === "active");

const months = [
  monthKey(shiftMonths(today, -11)),
  monthKey(shiftMonths(today, -10)),
  monthKey(shiftMonths(today, -9)),
  monthKey(shiftMonths(today, -8)),
  monthKey(shiftMonths(today, -7)),
  monthKey(shiftMonths(today, -6)),
  monthKey(shiftMonths(today, -5)),
  monthKey(shiftMonths(today, -4)),
  monthKey(shiftMonths(today, -3)),
  monthKey(shiftMonths(today, -2)),
  monthKey(shiftMonths(today, -1)),
  monthKey(today),
];

function buildSalaries(): SalaryRecord[] {
  const records: SalaryRecord[] = [];
  const allowancesByDepartment: Record<string, number> = {
    Engineering: 10000,
    "Human Resources": 8000,
    Finance: 9000,
    Sales: 12000,
    Marketing: 8000,
    "Customer Support": 6000,
    "Quality Assurance": 9000,
    Operations: 11000,
  };

  months.forEach((month, monthIndex) => {
    activeEmployees.forEach((emp, empIndex) => {
      const allowances = allowancesByDepartment[emp.department] ?? 8000;
      // Bonuses land in the last quarter of the year and mid-year
      const isBonusMonth = monthIndex % 6 === 5;
      const bonus = isBonusMonth ? Math.round(emp.basicSalary * (0.15 + random() * 0.1)) : 0;
      const tada = random() > 0.8 ? Math.round(300 + random() * 900) : 0;
      const pfDeduction = Math.round(emp.basicSalary * 0.1);
      const absenceDeduction = random() > 0.88 ? 1200 : 0;
      const deductions = pfDeduction + absenceDeduction;

      const net = emp.basicSalary + allowances + bonus + tada - deductions;
      const isPast = monthIndex < months.length - 1;
      const isCurrent = monthIndex === months.length - 1;

      records.push({
        id: `sal-${emp.id}-${month}`,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        month,
        basicSalary: emp.basicSalary,
        allowances,
        bonus: bonus + tada,
        deductions,
        netSalary: net,
        paymentStatus: isPast ? "paid" : isCurrent ? "processing" : "pending",
        paidAt: isPast ? `${month}-28T10:00:00.000Z` : undefined,
        remarks: absenceDeduction > 0 ? "Includes absence deduction" : undefined,
      });
      void empIndex;
    });
  });

  return records;
}

export const seedSalaryRecords: SalaryRecord[] = buildSalaries();

export const ALLOWANCE_TEMPLATES = [
  { label: "Household Allowance", amount: 6000 },
  { label: "Transport Allowance", amount: 2500 },
  { label: "Medical Allowance", amount: 2000 },
  { label: "Internet Allowance", amount: 1500 },
];

export const DEDUCTION_TEMPLATES = [
  { label: "Provident Fund (10%)", amount: 4000 },
  { label: "TDS", amount: 1500 },
  { label: "Absence Deduction", amount: 1200 },
  { label: "Provident Library Fund", amount: 500 },
];
