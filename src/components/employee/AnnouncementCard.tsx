import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/cn";
import { ANNOUNCEMENT_PRIORITY_META } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/Badge";
import { Megaphone, ArrowRight } from "lucide-react";
import type { NoticeSummary } from "@/types/announcement";

export function AnnouncementCard({
  notice,
  href,
  className,
}: {
  notice: NoticeSummary;
  href?: Route | `/employee/notices/${string}`;
  className?: string;
}) {
  const priority = ANNOUNCEMENT_PRIORITY_META[notice.priority];

  const body = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priority.tone} dot>
          {priority.label}
        </Badge>
        {!notice.isRead && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700">
            New
          </span>
        )}
        <span className="ml-auto text-xs text-ink-400">{formatDate(notice.publishedAt)}</span>
      </div>

      <h3 className={cn("mt-3 text-sm font-semibold text-ink-900", !notice.isRead && "text-brand-800")}>
        {notice.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">{notice.description}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
        <p className="truncate text-xs text-ink-400">By {notice.authorName}</p>
        {href && (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-700">
            View details
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block rounded-card border border-ink-100 bg-white p-4 shadow-card transition-all duration-150",
          "hover:border-brand-200 hover:shadow-card-hover",
          className,
        )}
      >
        {body}
      </Link>
    );
  }

  return (
    <div className={cn("rounded-card border border-ink-100 bg-white p-4 shadow-card", className)}>{body}</div>
  );
}

export function AnnouncementList({ notices }: { notices: NoticeSummary[] }) {
  return (
    <ul className="divide-y divide-ink-100">
      {notices.map((notice) => (
        <li key={notice.id} className="px-5 py-4 transition-colors duration-150 hover:bg-surface-subtle">
          <AnnouncementRow notice={notice} />
        </li>
      ))}
    </ul>
  );
}

function AnnouncementRow({ notice }: { notice: NoticeSummary }) {
  const priority = ANNOUNCEMENT_PRIORITY_META[notice.priority];
  return (
    <Link href={`/employee/notices/${notice.id}`} className="group flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 rounded-lg p-2",
          notice.isRead ? "bg-ink-50 text-ink-400" : "bg-brand-50 text-brand-600",
        )}
      >
        <Megaphone aria-hidden className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className={cn("text-sm font-medium", notice.isRead ? "text-ink-700" : "text-ink-900")}>
            {notice.title}
          </span>
          <Badge tone={priority.tone}>{priority.label}</Badge>
          {!notice.isRead && <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-label="Unread" />}
        </span>
        <span className="mt-1 line-clamp-1 block text-xs text-ink-500">{notice.description}</span>
      </span>
      <span className="shrink-0 text-xs whitespace-nowrap text-ink-400">{formatDate(notice.publishedAt)}</span>
    </Link>
  );
}
