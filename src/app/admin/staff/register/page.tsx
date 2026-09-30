import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegisterStaffForm } from "@/components/admin/RegisterStaffForm";
import { listDepartments } from "@/lib/api/employees";

export const metadata: Metadata = { title: "Register Staff" };

export default async function RegisterStaffPage() {
  // The department list is data, not a constant: it is read from the
  // `departments` table on the server and handed to the form as a prop, so the
  // database stays the only place a department name is defined.
  const departments = await listDepartments();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Admin Console", href: "/admin/dashboard" },
          { label: "Manage Staff", href: "/admin/staff" },
          { label: "Register Staff" },
        ]}
        title="Register Staff"
        description="Create a new staff account and assign their work details."
      />
      <RegisterStaffForm departments={departments} />
    </div>
  );
}