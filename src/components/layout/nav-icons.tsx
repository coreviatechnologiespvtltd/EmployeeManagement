import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ListTodo,
  CalendarCheck2,
  Wallet,
  TrendingUp,
  Plane,
  Megaphone,
  Users,
  UserPlus,
  ClipboardList,
  WalletCards,
  Settings,
} from "lucide-react";

/**
 * Nav icons are referenced by key so the navigation config stays serialisable
 * and can cross the server/client boundary into DashboardShell.
 */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  tasks: ListTodo,
  attendance: CalendarCheck2,
  wallet: Wallet,
  trending: TrendingUp,
  leave: Plane,
  notice: Megaphone,
  users: Users,
  userPlus: UserPlus,
  clipboard: ClipboardList,
  walletCards: WalletCards,
  settings: Settings,
} as const satisfies Record<string, LucideIcon>;

export type NavIconKey = keyof typeof NAV_ICONS;

export function NavIcon({ name, className }: { name: NavIconKey; className?: string }) {
  const Icon = NAV_ICONS[name];
  return <Icon aria-hidden className={className} />;
}
