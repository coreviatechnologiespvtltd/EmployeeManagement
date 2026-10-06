import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import { listSalaryForEmployee, getSalaryForMonth } from "@/lib/api/salary";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { DataTable, FLUSH_IN_CARD } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SalarySlipCard } from "@/components/employee/SalarySlipCard";
import { monthLabel, currentMonth, formatCurrency, formatDate } from "@/lib/format";
import { PAYMENT_STATUS_META } from "@/lib/status";
import { Wallet, TrendingUp, Receipt, PiggyBank } from "lucide-react";

export const metadata: Metadata = { title: "Salary" };

export default async function EmployeeSalaryPage() {
  const user = await requireRole("employee");
  const month = currentMonth();

  const [history, current] = await Promise.all([
    listSalaryForEmployee(user.id),
    getSalaryForMonth(user.id, month),
  ]);

  const previous = history.find((record) => record.month < month);
  const totalEarnings = history.reduce((sum, record) => sum + record.netSalary, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Salary" description="Your salary structure, payslips and payment history." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Net Salary (This Month)"
          value={formatCurrency(current?.netSalary ?? 0)}
          sublabel={monthLabel(month)}
          icon={Wallet}
          tone="info"
        />
        <DashboardCard
          label="Basic Salary"
          value={formatCurrency(current?.basicSalary ?? 0)}
          sublabel="Monthly base pay"
          icon={PiggyBank}
          tone="neutral"
        />
        <DashboardCard
          label="Total Deductions"
          value={formatCurrency(current?.deductions ?? 0)}
          sublabel="Provident fund, TDS and other"
          icon={Receipt}
          tone="warning"
        />
        <DashboardCard
          label="Earnings Till Date"
          value={formatCurrency(totalEarnings)}
          sublabel={`Across ${history.length} payslips`}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SalarySlipCard record={current} />
        </div>

        <SectionCard title="Salary at a Glance">
          {current ? (
            <dl className="space-y-4">
              <Row label="Salary month" value={monthLabel(current.month)} />
              <Row label="Payment status" value={<Badge tone={PAYMENT_STATUS_META[current.paymentStatus].tone}>{PAYMENT_STATUS_META[current.paymentStatus].label}</Badge>} />
              <Row label="Paid on" value={current.paidAt ? formatDate(current.paidAt) : "Not yet paid"} />
              <Row label="Gross earnings" value={formatCurrency(current.basicSalary + current.allowances + current.bonus)} />
              <Row label="Net salary" value={formatCurrency(current.netSalary)} strong />
              {previous && (
                <div className="border-t border-ink-100 pt-4">
                  <p className="text-xs text-ink-500">Previous month ({monthLabel(previous.month, "short")})</p>
                  <p className="mt-1 text-lg font-semibold text-ink-900">{formatCurrency(previous.netSalary)}</p>
                  <p
                    className={`mt-0.5 text-xs font-medium ${
                      current.netSalary >= previous.netSalary ? "text-success-600" : "text-danger-600"
                    }`}
                  >
                    {current.netSalary >= previous.netSalary ? "▲" : "▼"}{" "}
                    {formatCurrency(Math.abs(current.netSalary - previous.netSalary))} vs last month
                  </p>
                </div>
              )}
            </dl>
          ) : (
            <EmptyState
              icon={Wallet}
              title="No payslip yet"
              description={`A payslip for ${monthLabel(month)} has not been generated.`}
              className="py-8"
            />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Salary History" description="All recorded payslips" bodyClassName="p-0">
        {history.length === 0 ? (
          <EmptyState icon={Receipt} title="No salary records" description="Payslips will appear here once payroll is processed." className="py-12" />
        ) : (
          <DataTable
            rows={history}
            getRowKey={(row) => row.id}
            className={FLUSH_IN_CARD}
            caption="Salary history"
            columns={[
              { key: "month", header: "Month", render: (row) => <span className="font-medium whitespace-nowrap text-ink-800">{monthLabel(row.month)}</span> },
              { key: "basic", header: "Basic", render: (row) => <span className="whitespace-nowrap">{formatCurrency(row.basicSalary)}</span>, hideBelow: "md" },
              { key: "allow", header: "Allowances", render: (row) => <span className="whitespace-nowrap">{formatCurrency(row.allowances)}</span>, hideBelow: "md" },
              { key: "deduct", header: "Deductions", render: (row) => <span className="whitespace-nowrap text-danger-600">−{formatCurrency(row.deductions)}</span>, hideBelow: "lg" },
              { key: "net", header: "Net Salary", render: (row) => <span className="font-semibold whitespace-nowrap text-ink-900">{formatCurrency(row.netSalary)}</span> },
              {
                key: "status",
                header: "Status",
                render: (row) => <Badge tone={PAYMENT_STATUS_META[row.paymentStatus].tone}>{PAYMENT_STATUS_META[row.paymentStatus].label}</Badge>,
              },
            ]}
          />
        )}
      </SectionCard>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-sm text-ink-600">{label}</dt>
      <dd className={strong ? "text-base font-semibold text-ink-900" : "text-sm font-medium text-ink-800"}>{value}</dd>
    </div>
  );
}
