import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/service";
import { getNoticeForEmployee, markNoticeRead } from "@/lib/api/announcements";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmployeeAvatar } from "@/components/ui/EmployeeAvatar";
import { MarkNoticeReadButton } from "@/components/employee/MarkNoticeReadButton";
import { ANNOUNCEMENT_PRIORITY_META } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { CalendarDays, CheckCircle2 } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const user = await requireRole("employee");
  const result = await getNoticeForEmployee(id, user.id);
  return { title: result?.announcement.title ?? "Notice" };
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("employee");

  const result = await getNoticeForEmployee(id, user.id);
  if (!result) notFound();

  const { announcement, isRead } = result;
  if (!isRead) {
    await markNoticeRead(announcement.id, user.id);
  }

  const priority = ANNOUNCEMENT_PRIORITY_META[announcement.priority];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Employee Portal", href: "/employee/dashboard" },
          { label: "Notices", href: "/employee/notices" },
          { label: announcement.title },
        ]}
        title={announcement.title}
        description={announcement.description}
        action={
          isRead ? (
            <Badge tone="success" icon={CheckCircle2}>
              Read
            </Badge>
          ) : (
            <MarkNoticeReadButton noticeId={announcement.id} />
          )
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article className="lg:col-span-2">
          <SectionCard title="Announcement">
            <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 pb-4">
              <Badge tone={priority.tone} dot>
                {priority.label} priority
              </Badge>
              <span className="text-xs text-ink-400">
                Published on {formatDate(announcement.publishedAt, { day: "2-digit", month: "long", year: "numeric" })}
              </span>
            </div>

            <div className="prose-ems mt-5 text-sm leading-relaxed whitespace-pre-line text-ink-700">
              {announcement.body}
            </div>
          </SectionCard>
        </article>

        <aside className="space-y-6">
          <SectionCard title="Published by">
            <div className="flex items-center gap-3">
              <EmployeeAvatar name={announcement.authorName} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{announcement.authorName}</p>
                <p className="truncate text-xs text-ink-500">Administrator</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Details">
            <dl className="space-y-4">
              <div>
                <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                  <CalendarDays aria-hidden className="h-3.5 w-3.5 text-ink-400" />
                  Published
                </dt>
                <dd className="mt-1.5 text-sm text-ink-800">{formatDate(announcement.publishedAt)}</dd>
              </div>
              {announcement.expiresAt && (
                <div>
                  <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-500">
                    <CalendarDays aria-hidden className="h-3.5 w-3.5 text-ink-400" />
                    Valid until
                  </dt>
                  <dd className="mt-1.5 text-sm text-ink-800">{formatDate(announcement.expiresAt)}</dd>
                </div>
              )}
            </dl>
          </SectionCard>
        </aside>
      </div>
    </div>
  );
}
