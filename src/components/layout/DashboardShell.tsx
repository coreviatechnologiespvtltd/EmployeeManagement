"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Menu, LogOut, User, KeyRound, CircleHelp } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { ROLE_LABEL } from "@/lib/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { ChangePasswordDialog } from "@/components/auth/ChangePasswordDialog";
import { CoreviaBrand, SidebarNav, SidebarFooter } from "./sidebar-parts";
import { CompanyLogo } from "@/components/layout/CompanyLogo";
import { cn } from "@/lib/cn";
import type { AuthUser } from "@/types/auth";
import type { NavItem } from "@/lib/navigation";

export function DashboardShell({
  user,
  navItems,
  children,
}: {
  user: AuthUser;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Close the mobile drawer on navigation by keying the sheet off the pathname,
  // which avoids a setState-in-effect cascade.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (mobileOpen) setMobileOpen(false);
  }

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction();
      router.refresh();
    });
  };

  const roleLabel = ROLE_LABEL[user.role];

  return (
    <div className="min-h-screen bg-surface-subtle">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col border-r border-ink-100 bg-white transition-[width] duration-200 lg:flex",
          collapsed ? "w-[76px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 shrink-0 items-center border-b border-ink-100", collapsed ? "justify-center px-3" : "px-5")}>
          <CoreviaBrand collapsed={collapsed} />
        </div>

        <div className={cn("flex-1 overflow-y-auto py-4", collapsed ? "px-3" : "px-4")}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">{roleLabel}</p>
          )}
          <SidebarNav items={navItems} activeHref={pathname} collapsed={collapsed} />
        </div>

        <div className={cn("shrink-0 border-t border-ink-100", collapsed ? "p-3" : "p-4")}>
          <SidebarFooter
            user={user}
            roleLabel={roleLabel}
            onLogout={handleLogout}
            collapsed={collapsed}
            isPending={isPending}
          />
        </div>
      </aside>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onClose={() => setMobileOpen(false)} title="Navigation">
        <div className="space-y-4 p-4">
          <CoreviaBrand />
          <p className="px-1 text-[11px] font-semibold tracking-wider text-ink-400 uppercase">{roleLabel}</p>
          <SidebarNav items={navItems} activeHref={pathname} onNavigate={() => setMobileOpen(false)} />
        </div>
        <div className="border-t border-ink-100">
          <SidebarFooter user={user} roleLabel={roleLabel} onLogout={handleLogout} isPending={isPending} />
        </div>
      </Sheet>

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[76px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-ink-100 bg-white/85 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu aria-hidden className="h-5 w-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
          >
            {collapsed ? <PanelLeftOpen aria-hidden className="h-5 w-5" /> : <PanelLeftClose aria-hidden className="h-5 w-5" />}
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-3">
            <CompanyLogo size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink-900">Corevia Technologies</p>
              <p className="hidden truncate text-[11px] text-ink-500 sm:block">{roleLabel}</p>
            </div>
          </div>

          <DropdownMenu
            triggerClassName="rounded-full"
            trigger={
              <span className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors duration-150 hover:bg-ink-50">
                <EmployeeAvatar name={user.name} size="sm" />
                <span className="hidden max-w-32 truncate text-sm font-medium text-ink-700 md:block">{user.name}</span>
              </span>
            }
            items={[
              { label: user.name, icon: <User aria-hidden className="h-4 w-4" />, disabled: true },
              {
                label: "Change password",
                icon: <KeyRound aria-hidden className="h-4 w-4" />,
                onSelect: () => setChangePasswordOpen(true),
              },
              { label: "Help & support", icon: <CircleHelp aria-hidden className="h-4 w-4" />, disabled: true },
              { label: "Logout", icon: <LogOut aria-hidden className="h-4 w-4" />, danger: true, onSelect: handleLogout },
            ]}
          />
        </header>

        <main id="main-content" className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">{children}</div>
        </main>
      </div>

      {/* One instance for both the desktop header menu and the mobile drawer. */}
      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} />
    </div>
  );
}
