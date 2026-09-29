import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/service";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { EMPLOYEE_NAV } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Employee Portal",
};

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  // Authoritative guard. proxy.ts only does coarse cookie-presence checks.
  const user = await requireRole("employee");
  if (user.role === "admin") redirect("/admin/dashboard");

  return (
    <ToastProvider>
      <DashboardShell user={user} navItems={EMPLOYEE_NAV}>
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
