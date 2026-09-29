import type { Metadata } from "next";
import { listAllAnnouncements } from "@/lib/api/announcements";
import { PageHeader } from "@/components/ui/PageHeader";
import { DashboardCard } from "@/components/ui/DashboardCard";
import { AnnouncementManagement } from "@/components/admin/AnnouncementManagement";
import { Megaphone, Send, FileEdit, Archive } from "lucide-react";

export const metadata: Metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  const announcements = await listAllAnnouncements();

  const countBy = (status: string) => announcements.filter((a) => a.status === status).length;
  const readCount = announcements.reduce((sum, a) => sum + a.readBy.length, 0);
  const published = countBy("published");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Publish company notices and circulars for all employees."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total" value={announcements.length} icon={Megaphone} tone="info" />
        <DashboardCard label="Published" value={published} icon={Send} tone="success" />
        <DashboardCard label="Drafts" value={countBy("draft")} icon={FileEdit} tone="warning" />
        <DashboardCard
          label="Archived"
          value={countBy("archived")}
          sublabel={`${readCount} total reads`}
          icon={Archive}
          tone="neutral"
        />
      </div>

      <AnnouncementManagement announcements={announcements} />
    </div>
  );
}
