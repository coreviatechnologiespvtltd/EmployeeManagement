import type { Metadata } from "next";
import Link from "next/link";
import { listEmployees, getStaffCountByStatus, listDepartmentsInUse } from "@/lib/api/employees";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { Button } from "@/components/ui/Button";
import { StaffTable } from "@/components/admin/StaffTable";
import { Users, UserCheck, UserX, UserPlus } from "lucide-react";

export const metadata: Metadata = { title: "Manage Staff" };

export default async function AdminStaffPage() {
  const [employees, counts] = await Promise.all([listEmployees(), getStaffCountByStatus()]);
  const departments = await listDepartmentsInUse();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Staff"
        description="View, update and manage every staff member in the organisation."
        action={
          <Link href="/admin/staff/register">
            <Button>
              <UserPlus aria-hidden className="h-4 w-4" />
              Register Staff
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total Staff" value={counts.total} sublabel={`${departments.length} departments`} icon={Users} tone="info" />
        <DashboardCard label="Active" value={counts.active} icon={UserCheck} tone="success" />
        <DashboardCard label="Inactive" value={counts.inactive} icon={UserX} tone="neutral" />
        <DashboardCard
          label="Administrators"
          value={employees.filter((e) => e.role === "admin").length}
          sublabel="With console access"
          icon={UserCheck}
          tone="warning"
        />
      </div>

      <StaffTable employees={employees} />
    </div>
  );
}
