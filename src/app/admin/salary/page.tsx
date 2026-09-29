import type { Metadata } from "next";
import { listAllSalaries, getPayrollTotals, getAvailableMonths } from "@/lib/api/salary";
import { listEmployees } from "@/lib/api/employees";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SalaryManagementTable } from "@/components/admin/SalaryManagementTable";
import { WalletCards, TrendingUp, Receipt, Users } from "lucide-react";
import { currentMonth, formatCurrency, monthLabel } from "@/lib/format";

export const metadata: Metadata = { title: "Salary Management" };

export default async function AdminSalaryPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month: requestedMonth } = await searchParams;
  const month = requestedMonth ?? currentMonth();

  const [records, months, employees, totals] = await Promise.all([
    listAllSalaries({ month }),
    getAvailableMonths(),
    listEmployees({ status: "active" }),
    getPayrollTotals(month),
  ]);

  const staff = employees.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    department: employee.department,
    basicSalary: employee.basicSalary,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salary Management"
        description={`Payroll overview and records for ${monthLabel(month)}.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Net Payroll"
          value={formatCurrency(totals.net)}
          sublabel={monthLabel(totals.month)}
          icon={WalletCards}
          tone="info"
        />
        <DashboardCard
          label="Gross Earnings"
          value={formatCurrency(totals.gross)}
          sublabel="Before deductions"
          icon={TrendingUp}
          tone="success"
        />
        <DashboardCard
          label="Total Deductions"
          value={formatCurrency(totals.deductions)}
          icon={Receipt}
          tone="warning"
        />
        <DashboardCard
          label="Payment Status"
          value={`${totals.paid}/${totals.employees}`}
          sublabel={`${totals.pending} still pending`}
          icon={Users}
          tone={totals.pending > 0 ? "danger" : "success"}
        />
      </div>

      <SalaryManagementTable records={records} staff={staff} months={months} currentMonth={month} />
    </div>
  );
}
