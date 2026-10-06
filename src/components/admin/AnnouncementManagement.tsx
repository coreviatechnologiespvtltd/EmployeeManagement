"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/Modal";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { AnnouncementFormModal } from "@/components/admin/AnnouncementFormModal";
import {
  setAnnouncementStatusAction,
  deleteAnnouncementAction,
} from "@/app/admin/actions";
import { ANNOUNCEMENT_PRIORITIES, ANNOUNCEMENT_STATUSES } from "@/lib/constants";
import { ANNOUNCEMENT_PRIORITY_META, ANNOUNCEMENT_STATUS_META } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { Megaphone, MoreHorizontal, Pencil, Archive, FileEdit, Send, Trash2, Plus } from "lucide-react";
import type { Announcement, AnnouncementStatus } from "@/types/announcement";

export function AnnouncementManagement({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [status, setStatus] = useState<AnnouncementStatus | "all">("all");
  const [priority, setPriority] = useState<"all" | "low" | "normal" | "high" | "urgent">("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<Announcement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return announcements.filter((announcement) => {
      if (q && ![announcement.title, announcement.description].join(" ").toLowerCase().includes(q)) return false;
      if (status !== "all" && announcement.status !== status) return false;
      if (priority !== "all" && announcement.priority !== priority) return false;
      return true;
    });
  }, [announcements, query, status, priority]);

  function changeStatus(announcement: Announcement, next: AnnouncementStatus) {
    startTransition(async () => {
      const result = await setAnnouncementStatusAction(announcement.id, next);
      toast(result.message, result.success ? "success" : "error");
      if (result.success) router.refresh();
    });
  }

  const tabs = (["all", "published", "draft", "archived"] as const).map((value) => ({
    value,
    label: value === "all" ? "All" : ANNOUNCEMENT_STATUSES.find((s) => s.value === value)?.label ?? value,
    count:
      value === "all"
        ? announcements.length
        : announcements.filter((a) => a.status === value).length,
  }));

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={tabs}
          value={status}
          onChange={(value) => setStatus(value as AnnouncementStatus | "all")}
          className="min-w-[280px] flex-1"
          ariaLabel="Filter announcements by status"
        />
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search announcements"
            label="Search announcements"
          />
          <Select
            id="announcement-priority"
            label="Priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value as typeof priority)}
            options={[
              { value: "all", label: "All priorities" },
              ...ANNOUNCEMENT_PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
            ]}
          />
        </div>
        <p className="text-xs text-ink-500">
          {filtered.length} of {announcements.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-card border border-ink-100 bg-white py-14 text-center shadow-card">
          <p className="text-sm font-semibold text-ink-900">No announcements found</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
            {query || priority !== "all" || status !== "all"
              ? "Try adjusting your search or filters."
              : "Create your first announcement to notify all employees."}
          </p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            <Megaphone aria-hidden className="h-4 w-4" />
            New Announcement
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((announcement) => {
            const priorityMeta = ANNOUNCEMENT_PRIORITY_META[announcement.priority];
            const statusMeta = ANNOUNCEMENT_STATUS_META[announcement.status];

            return (
              <article
                key={announcement.id}
                className="flex flex-col rounded-card border border-ink-100 bg-white p-5 shadow-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={priorityMeta.tone} dot>
                    {priorityMeta.label}
                  </Badge>
                  <Badge tone={statusMeta.tone}>{statusMeta.label}</Badge>
                  <span className="ml-auto text-xs text-ink-400">{formatDate(announcement.publishedAt)}</span>
                </div>

                <h3 className="mt-3 text-sm font-semibold text-ink-900">{announcement.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-ink-500">
                  {announcement.description}
                </p>
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-400">
                  {announcement.body}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-ink-100 pt-3">
                  <div className="min-w-0 text-xs text-ink-400">
                    <p className="truncate">By {announcement.authorName}</p>
                    <p className="mt-0.5">
                      {announcement.readBy.length} read
                      {announcement.expiresAt ? ` · expires ${formatDate(announcement.expiresAt)}` : ""}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    {announcement.status === "published" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => changeStatus(announcement, "draft")}
                      >
                        <FileEdit aria-hidden className="h-3.5 w-3.5" />
                        Unpublish
                      </Button>
                    )}
                    {announcement.status === "draft" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => changeStatus(announcement, "published")}
                      >
                        <Send aria-hidden className="h-3.5 w-3.5" />
                        Publish
                      </Button>
                    )}
                    {announcement.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => changeStatus(announcement, "archived")}
                      >
                        <Archive aria-hidden className="h-3.5 w-3.5" />
                        Archive
                      </Button>
                    )}

                    <DropdownMenu
                      align="right"
                      trigger={
                        <Button variant="ghost" size="icon" aria-label={`Actions for ${announcement.title}`}>
                          <MoreHorizontal aria-hidden className="h-4 w-4" />
                        </Button>
                      }
                      items={[
                        {
                          label: "Edit",
                          icon: <Pencil aria-hidden className="h-4 w-4" />,
                          onSelect: () => setEditing(announcement),
                        },
                        {
                          label: "Delete",
                          icon: <Trash2 aria-hidden className="h-4 w-4" />,
                          danger: true,
                          onSelect: () => setConfirm(announcement),
                        },
                      ]}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(editing || creating) && (
        <AnnouncementFormModal
          announcement={editing}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
        />
      )}

      <ConfirmDialog
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title="Delete announcement"
        message={confirm ? `"${confirm.title}" will be permanently removed.` : "This cannot be undone."}
        confirmLabel="Delete"
        isPending={pending}
        onConfirm={() => {
          if (!confirm) return;
          startTransition(async () => {
            const result = await deleteAnnouncementAction(confirm.id);
            toast(result.message, result.success ? "success" : "error");
            if (result.success) {
              setConfirm(null);
              router.refresh();
            }
          });
        }}
      />

      {pending && <span className="sr-only" role="status">Updating…</span>}
    </>
  );
}
