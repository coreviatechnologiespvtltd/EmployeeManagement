import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavItem } from "@/lib/navigation";
import { NavIcon } from "@/components/layout/nav-icons";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { Button } from "@/components/ui/Button";
import { LogOut } from "lucide-react";
import type { AuthUser } from "@/types/auth";

export function CoreviaBrand({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white shadow-sm">
        C
      </span>
      {!collapsed && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-ink-900">Corevia</span>
          <span className="block truncate text-[11px] text-ink-500">Technologies</span>
        </span>
      )}
    </Link>
  );
}

export function SidebarNav({
  items,
  activeHref,
  collapsed = false,
  onNavigate,
}: {
  items: NavItem[];
  activeHref: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main navigation" className="space-y-1">
      {items.map((item) => {
        const isActive = item.end ? activeHref === item.href : activeHref.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            title={collapsed ? item.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
              collapsed && "justify-center px-2",
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
            )}
          >
            <NavIcon
              name={item.icon}
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                isActive ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
              )}
            />
            {!collapsed && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarFooter({
  user,
  roleLabel,
  onLogout,
  collapsed = false,
  isPending = false,
}: {
  user: AuthUser;
  roleLabel: string;
  onLogout: () => void;
  collapsed?: boolean;
  isPending?: boolean;
}) {
  if (collapsed) {
    return (
      <div className="space-y-2 border-t border-ink-100 pt-3">
        <div className="flex justify-center">
          <EmployeeAvatar name={user.name} size="sm" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="w-full"
          onClick={onLogout}
          isLoading={isPending}
          loadingText=""
          aria-label="Log out"
          title="Log out"
        >
          <LogOut aria-hidden className="h-[18px] w-[18px]" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t border-ink-100 pt-3">
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
        <EmployeeAvatar name={user.name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink-900">{user.name}</p>
          <p className="truncate text-[11px] text-ink-500">{roleLabel}</p>
        </div>
      </div>
      <Button variant="ghost" className="w-full justify-start gap-2.5" onClick={onLogout} isLoading={isPending} loadingText="Logging out…">
        <LogOut aria-hidden className="h-[18px] w-[18px] text-ink-400" />
        Logout
      </Button>
    </div>
  );
}
