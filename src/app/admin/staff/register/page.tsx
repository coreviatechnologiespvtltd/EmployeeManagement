import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RegisterStaffForm } from "@/components/admin/RegisterStaffForm";

export const metadata: Metadata = { title: "Register Staff" };

export default function RegisterStaffPage() {
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
      <RegisterStaffForm />
    </div>
  );
}
