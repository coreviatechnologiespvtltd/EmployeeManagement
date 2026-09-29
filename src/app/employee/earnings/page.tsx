import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import { getEarningsSummary, getEarningsSeries } from "@/lib/api/salary";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatCurrency, monthLabel, currentMonth } from "@/lib/format";
import { TrendingUp, Wallet, CalendarClock, Gift } from "lucide-react";
import type { MonthlyEarnings } from "@/types/salary";

export const metadata: Metadata = { title: "Earnings" };

export default async function EmployeeEarningsPage() {
  const user = await requireRole("employee");

  const [summary, series] = await Promise.all([getEarningsSummary(user.id), getEarningsSeries(user.id, 12)]);

  const current = series[series.length - 1] ?? null;
  const previous = series[series.length - 2] ?? null;
  const totalBonus = series.reduce((sum, item) => sum + item.bonus, 0);
  const totalIncentives = series.reduce((sum, item) => sum + item.incentives, 0);
  const totalOther = series.reduce((sum, item) => sum + item.other, 0);
  const totalAllowances = series.reduce((sum, item) => sum + item.allowances, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Earnings" description="Your earnings, bonuses and incentives over time." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard
          label="Total Earnings Till Date"
          value={formatCurrency(summary.total)}
          sublabel={`Across ${summary.records.length} months`}
          icon={TrendingUp}
          tone="success"
        />
        <DashboardCard
          label="Current Month"
          value={formatCurrency(current?.net ?? 0)}
          sublabel={monthLabel(currentMonth())}
          icon={Wallet}
          tone="info"
        />
        <DashboardCard
          label="Previous Month"
          value={formatCurrency(previous?.net ?? 0)}
          sublabel={previous ? monthLabel(previous.month) : "No data"}
          icon={CalendarClock}
          tone="neutral"
        />
        <DashboardCard
          label="Bonuses & Incentives"
          value={formatCurrency(totalBonus + totalIncentives)}
          sublabel={`${formatCurrency(totalBonus)} bonus · ${formatCurrency(totalIncentives)} incentive`}
          icon={Gift}
          tone="warning"
        />
      </div>

      <SectionCard
        title="Earnings Over Time"
        description="Net earnings by month for the last 12 months"
      >
        <BarChart
          data={series.map((item) => ({
            label: item.label,
            value: item.net,
            segments: [
              { label: "Basic", value: item.basic, color: "var(--color-brand-600)" },
              { label: "Allowances", value: item.allowances, color: "var(--color-brand-400)" },
              { label: "Bonus", value: item.bonus, color: "var(--color-brand-200)" },
            ],
          }))}
          height={260}
        />
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink-100 pt-4">
          {[
            { label: "Basic", color: "var(--color-brand-600)" },
            { label: "Allowances", color: "var(--color-brand-400)" },
            { label: "Bonus", color: "var(--color-brand-200)" },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-2 text-xs text-ink-600">
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <SectionCard className="lg:col-span-2" title="Earnings Composition" description="Last 12 months">
          <DonutChart
            size={170}
            centerLabel="Total earnings"
            centerValue={formatCurrency(summary.total)}
            data={[
              { label: "Basic Salary", value: series.reduce((sum, item) => sum + item.basic, 0), color: "var(--color-brand-600)" },
              { label: "Allowances", value: totalAllowances, color: "var(--color-brand-400)" },
              { label: "Bonus", value: totalBonus, color: "var(--color-brand-200)" },
              { label: "Incentives", value: totalIncentives, color: "var(--color-success-500)" },
              { label: "Other", value: totalOther, color: "var(--color-ink-300)" },
            ]}
          />
        </SectionCard>

        <SectionCard className="lg:col-span-3" title="Monthly Breakdown" description="Earnings and deductions per month" bodyClassName="p-0">
          <MonthlyBreakdownTable series={series} />
        </SectionCard>
      </div>
    </div>
  );
}

function MonthlyBreakdownTable({ series }: { series: MonthlyEarnings[] }) {
  const reversed = [...series].reverse();

  if (reversed.every((item) => item.net === 0)) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No earnings recorded"
        description="Salary records will appear here once payroll is processed."
        className="py-12"
      />
    );
  }

  return (
    <DataTable
      rows={reversed}
      getRowKey={(row) => row.month}
      className="shadow-none"
      caption="Monthly earnings breakdown"
      columns={[
        { key: "month", header: "Month", render: (row) => <span className="font-medium whitespace-nowrap text-ink-800">{monthLabel(row.month)}</span> },
        { key: "basic", header: "Basic", render: (row) => <span className="whitespace-nowrap">{formatCurrency(row.basic)}</span>, hideBelow: "md" },
        { key: "allow", header: "Allowances", render: (row) => <span className="whitespace-nowrap">{formatCurrency(row.allowances)}</span>, hideBelow: "lg" },
        { key: "bonus", header: "Bonus", render: (row) => <span className="whitespace-nowrap">{row.bonus > 0 ? formatCurrency(row.bonus) : "—"}</span>, hideBelow: "lg" },
        { key: "ded", header: "Deductions", render: (row) => <span className="whitespace-nowrap text-danger-600">−{formatCurrency(row.deductions)}</span>, hideBelow: "xl" },
        { key: "net", header: "Net", render: (row) => <span className="font-semibold whitespace-nowrap text-ink-900">{formatCurrency(row.net)}</span> },
      ]}
    />
  );
}
