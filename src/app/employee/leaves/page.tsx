import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import { listLeavesForEmployee, getLeaveBalance } from "@/lib/api/leaves";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { SectionCard } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { LeaveRequestSection } from "@/components/employee/LeaveRequestSection";
import { formatNumber } from "@/lib/format";
import { CalendarRange, CalendarCheck2, Hourglass, Umbrella } from "lucide-react";

export const metadata: Metadata = { title: "Leaves" };

export default async function EmployeeLeavesPage() {
  const user = await requireRole("employee");
  const [balance, requests] = await Promise.all([getLeaveBalance(user.id), listLeavesForEmployee(user.id)]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leaves"
        description="Your leave allocation, balance and request history."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total Allocation" value={`${balance.total} Days`} icon={CalendarRange} tone="info" />
        <DashboardCard label="Used" value={`${balance.used} Days`} icon={CalendarCheck2} tone="warning" />
        <DashboardCard
          label="Pending"
          value={`${balance.pending} Days`}
          sublabel={`${pendingCount} request${pendingCount === 1 ? "" : "s"} awaiting approval`}
          icon={Hourglass}
          tone="info"
        />
        <DashboardCard label="Remaining" value={`${balance.remaining} Days`} icon={Umbrella} tone="success" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard className="lg:col-span-2" title="Your Requests" description="Submit and track leave applications">
          <LeaveRequestSection requests={requests} />
        </SectionCard>

        <SectionCard title="Balance Summary" description="Allocation for the current year">
          <div className="space-y-5">
            <ProgressBar value={balance.used} max={balance.total} label="Used" tone="warning" />
            <ProgressBar value={balance.pending} max={balance.total} label="Pending approval" tone="brand" />
            <ProgressBar value={balance.remaining} max={balance.total} label="Available" tone="success" />

            <dl className="space-y-3 border-t border-ink-100 pt-4">
              <div className="flex items-center justify-between">
                <dt className="text-sm text-ink-600">Total allocation</dt>
                <dd className="text-sm font-medium text-ink-900">{formatNumber(balance.total)} days</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-ink-600">Approved requests</dt>
                <dd className="text-sm font-medium text-ink-900">{approvedCount}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-sm text-ink-600">Available balance</dt>
                <dd className="text-sm font-semibold text-success-700">{formatNumber(balance.remaining)} days</dd>
              </div>
            </dl>

            <p className="rounded-lg bg-surface-subtle px-3.5 py-2.5 text-xs leading-relaxed text-ink-500">
              Unpaid and maternity leave are excluded from the annual allocation.
            </p>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
