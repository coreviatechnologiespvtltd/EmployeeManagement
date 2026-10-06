import type { Route } from "next";
import type { NavIconKey } from "@/components/layout/nav-icons";
import type { Role } from "@/types/auth";

export interface NavChild {
  label: string;
  href: Route;
  /** Match the child exactly rather than as a prefix. */
  end?: boolean;
}

export interface NavItem {
  label: string;
  href: Route;
  icon: NavIconKey;
  end?: boolean;
  /**
   * Sub-pages rendered as an expandable group. The parent's `href` stays the
   * canonical landing page, so the group still resolves to somewhere real when
   * it is collapsed.
   */
  children?: NavChild[];
}

export const EMPLOYEE_NAV: NavItem[] = [
  { label: "Dashboard", href: "/employee/dashboard", icon: "dashboard", end: true },
  { label: "To-Do List", href: "/employee/todo", icon: "tasks" },
  { label: "Attendance", href: "/employee/attendance", icon: "attendance" },
  { label: "Salary", href: "/employee/salary", icon: "wallet" },
  { label: "Earnings", href: "/employee/earnings", icon: "trending" },
  { label: "Leaves", href: "/employee/leaves", icon: "leave" },
  { label: "Notices", href: "/employee/notices", icon: "notice" },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard", end: true },
  { label: "Manage Staff", href: "/admin/staff", icon: "users" },
  { label: "Announcements", href: "/admin/announcements", icon: "notice" },
  { label: "Staff To-Do Lists", href: "/admin/tasks", icon: "clipboard" },
  { label: "Leave Applications", href: "/admin/leaves", icon: "leave" },
  { label: "Salary Management", href: "/admin/salary", icon: "walletCards" },
  { label: "Register Staff", href: "/admin/staff/register", icon: "userPlus" },
  { label: "Assign Task", href: "/admin/tasks/create", icon: "tasks" },
  {
    label: "Attendance",
    href: "/admin/attendance",
    icon: "attendance",
    children: [
      { label: "Attendance", href: "/admin/attendance", end: true },
      { label: "Attendance Management", href: "/admin/attendance/management" },
    ],
  },
  { label: "Settings", href: "/admin/settings", icon: "settings" },
];

export const ROLE_HOME: Record<Role, Route> = {
  employee: "/employee/dashboard",
  admin: "/admin/dashboard",
};

export const ROLE_LABEL: Record<Role, string> = {
  employee: "Employee Portal",
  admin: "Admin Console",
};
