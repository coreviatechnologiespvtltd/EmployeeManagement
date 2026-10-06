import type { Metadata } from "next";
import { getCompanyPolicy } from "@/lib/api/settings";
import { requireRole } from "@/lib/auth/service";
import { PageHeader } from "@/components/ui/PageHeader";
import { CompanySettingsForm } from "@/components/admin/CompanySettingsForm";
import { formatClockMinutes, lateCutoffMinutes } from "@/lib/attendance-policy";

export const metadata: Metadata = { title: "Settings" };

/**
 * Company policy, editable by an admin.
 *
 * The page is deliberately read-only in spirit: it shows the current rules and
 * the cutoff they produce, so an admin can see what a change will mean before
 * making it. Saving goes through `updateCompanySettingsAction`, which also
 * re-derives stored attendance statuses.
 */
export default async function AdminSettingsPage() {
  await requireRole("admin");

  const policy = await getCompanyPolicy();
  const cutoff = formatClockMinutes(lateCutoffMinutes(policy));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Admin Console", href: "/admin/dashboard" },
          { label: "Settings" },
        ]}
        title="Settings"
        description={`Attendance is currently judged against a ${cutoff} cutoff.`}
      />

      <CompanySettingsForm
        policy={{
          workdayStart: policy.workdayStart,
          lateThresholdMinutes: policy.lateThresholdMinutes,
          standardWorkingHours: policy.standardWorkingHours,
          leaveAllocationDays: policy.leaveAllocationDays,
        }}
      />
    </div>
  );
}