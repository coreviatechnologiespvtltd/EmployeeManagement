import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/service";
import { listNoticesForEmployee, getUnreadNoticeCount } from "@/lib/api/announcements";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnnouncementCard } from "@/components/employee/AnnouncementCard";
import { Megaphone, MailOpen, Bell, Inbox } from "lucide-react";
import { ANNOUNCEMENT_PRIORITIES } from "@/lib/constants";

export const metadata: Metadata = { title: "Notices" };

export default async function EmployeeNoticesPage() {
  const user = await requireRole("employee");
  const [notices, unread] = await Promise.all([listNoticesForEmployee(user.id), getUnreadNoticeCount(user.id)]);

  const urgentCount = notices.filter((n) => n.priority === "urgent" || n.priority === "high").length;

  return (
    <div className="space-y-6">
      <PageHeader title="Notices" description="Company announcements, circulars and updates." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Notices" value={notices.length} icon={Megaphone} tone="info" />
        <DashboardCard label="Unread" value={unread} icon={Bell} tone={unread > 0 ? "warning" : "neutral"} />
        <DashboardCard label="Priority Notices" value={urgentCount} icon={Inbox} tone="danger" />
      </div>

      {notices.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white shadow-card">
          <EmptyState
            icon={MailOpen}
            title="No notices"
            description="There are no published announcements for you right now. Check back later."
          />
        </div>
      ) : (
        <div className="space-y-6">
          {(["urgent", "high", "normal", "low"] as const).map((priority) => {
            const group = notices.filter((notice) => notice.priority === priority);
            if (group.length === 0) return null;
            const label = ANNOUNCEMENT_PRIORITIES.find((p) => p.value === priority)?.label ?? priority;

            return (
              <section key={priority} className="space-y-3">
                {priority === "urgent" || priority === "high" ? (
                  <h2 className="text-xs font-semibold tracking-wider text-ink-500 uppercase">{label} priority</h2>
                ) : null}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                  {group.map((notice) => (
                    <AnnouncementCard key={notice.id} notice={notice} href={`/employee/notices/${notice.id}`} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
