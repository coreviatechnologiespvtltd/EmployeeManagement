import type { Metadata } from "next";
import { listAllLeaves, getPendingLeaveCount } from "@/lib/api/leaves";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { LeaveManagementTable } from "@/components/admin/LeaveManagementTable";
import { Plane, CheckCircle2, XCircle, Hourglass } from "lucide-react";

export const metadata: Metadata = { title: "Leave Applications" };

export default async function AdminLeavesPage() {
  const [requests, pendingCount] = await Promise.all([listAllLeaves(), getPendingLeaveCount()]);

  const approved = requests.filter((r) => r.status === "approved");
  const rejected = requests.filter((r) => r.status === "rejected");
  const pendingDays = requests
    .filter((r) => r.status === "pending")
    .reduce((sum, r) => sum + r.totalDays, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Applications"
        description="Review and decide on leave requests submitted by staff."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total Requests" value={requests.length} icon={Plane} tone="info" />
        <DashboardCard
          label="Pending"
          value={pendingCount}
          sublabel={`${pendingDays} day${pendingDays === 1 ? "" : "s"} awaiting decision`}
          icon={Hourglass}
          tone={pendingCount > 0 ? "warning" : "neutral"}
        />
        <DashboardCard
          label="Approved"
          value={approved.length}
          sublabel={`${approved.reduce((s, r) => s + r.totalDays, 0)} days granted`}
          icon={CheckCircle2}
          tone="success"
        />
        <DashboardCard label="Rejected" value={rejected.length} icon={XCircle} tone="danger" />
      </div>

      <LeaveManagementTable requests={requests} />
    </div>
  );
}
