"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { NavChild, NavItem } from "@/lib/navigation";
import { NavIcon } from "@/components/layout/nav-icons";
import { CompanyLogo } from "@/components/layout/CompanyLogo";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { Button } from "@/components/ui/Button";
import { ChevronDown, LogOut } from "lucide-react";
import type { AuthUser } from "@/types/auth";

function isActive(href: string, activeHref: string, end?: boolean): boolean {
  return end ? activeHref === href : activeHref.startsWith(href);
}

export function CoreviaBrand({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", collapsed && "justify-center", className)}>
      <CompanyLogo size="md" />
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold tracking-tight text-ink-900">
            Corevia Technologies
          </span>
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
        const children = item.children;

        // A collapsed sidebar has no room for a disclosure, so a group degrades
        // to a plain link to its own landing page.
        if (children && !collapsed) {
          return (
            <NavGroup
              key={item.href}
              item={item}
              items={children}
              activeHref={activeHref}
              onNavigate={onNavigate}
            />
          );
        }

        return (
          <SidebarLink
            key={item.href}
            item={item}
            activeHref={activeHref}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function SidebarLink({
  item,
  activeHref,
  collapsed = false,
  onNavigate,
}: {
  item: NavItem;
  activeHref: string;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const active = isActive(item.href, activeHref, item.end);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
        collapsed && "justify-center px-2",
        active ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
      )}
    >
      <NavIcon
        name={item.icon}
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

/**
 * An expandable group of sub-pages.
 *
 * The parent row both navigates and toggles: the label is the link to the
 * section's landing page, and the chevron beside it is the disclosure. The group
 * opens itself whenever anything inside it is active, so a deep link never lands
 * on a collapsed parent with the current page hidden.
 */
function NavGroup({
  item,
  items: children,
  activeHref,
  onNavigate,
}: {
  item: NavItem;
  items: NavChild[];
  activeHref: string;
  onNavigate?: () => void;
}) {
  const childActive = children.some((child) => isActive(child.href, activeHref, child.end));
  const active = isActive(item.href, activeHref, item.end);
  const [open, setOpen] = useState(childActive);

  // Landing on a page inside the group while it is closed — a refresh on a
  // bookmarked sub-page — should reveal where you are.
  const expanded = open || childActive;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center rounded-lg transition-colors duration-150",
          childActive || active ? "bg-brand-50" : "hover:bg-ink-50",
        )}
      >
        <Link
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150",
            childActive || active ? "text-brand-700" : "text-ink-600 hover:text-ink-900",
          )}
        >
          <NavIcon
            name={item.icon}
            className={cn(
              "h-[18px] w-[18px] shrink-0",
              childActive || active ? "text-brand-600" : "text-ink-400 group-hover:text-ink-600",
            )}
          />
          <span className="truncate">{item.label}</span>
        </Link>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={expanded}
          aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
          className="mr-1.5 rounded p-1.5 text-ink-400 transition-colors hover:bg-white hover:text-ink-700"
        >
          <ChevronDown
            aria-hidden
            className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      </div>

      {expanded && (
        <ul className="mt-1 space-y-0.5 border-l border-ink-100 pl-3 ml-5">
          {children.map((child) => {
            const childIsActive = isActive(child.href, activeHref, child.end);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={childIsActive ? "page" : undefined}
                  className={cn(
                    "block truncate rounded-lg px-3 py-2 text-sm transition-colors duration-150",
                    childIsActive
                      ? "bg-brand-50 font-medium text-brand-700"
                      : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
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
      <div className="space-y-2">
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
    <div className="space-y-2">
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
