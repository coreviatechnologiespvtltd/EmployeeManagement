import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/service";
import { ToastProvider } from "@/components/ui/Toast";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { ADMIN_NAV } from "@/lib/navigation";

export const metadata: Metadata = {
  title: "Admin Console",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Authoritative guard. Employees hitting /admin/* are sent to /unauthorized.
  const user = await requireRole("admin");
  if (user.role !== "admin") redirect("/employee/dashboard");

  return (
    <ToastProvider>
      <DashboardShell user={user} navItems={ADMIN_NAV}>
        {children}
      </DashboardShell>
    </ToastProvider>
  );
}
