import "server-only";
import { db, nextId } from "@/lib/db/store";
import { requireActionRole } from "@/lib/auth/actions";
import { simulateLatency } from "./latency";
import { today } from "@/lib/format";
import type { AuthUser } from "@/types/auth";
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementStatus,
  NoticeSummary,
} from "@/types/announcement";
import { revalidatePath } from "next/cache";

export interface AnnouncementFilters {
  query?: string;
  status?: AnnouncementStatus | "all";
  priority?: AnnouncementPriority | "all";
  sort?: "publishedAt" | "priority" | "title";
  order?: "asc" | "desc";
}

const PRIORITY_ORDER: Record<AnnouncementPriority, number> = { urgent: 4, high: 3, normal: 2, low: 1 };

function isVisible(announcement: Announcement): boolean {
  if (announcement.status !== "published") return false;
  if (announcement.expiresAt && announcement.expiresAt.slice(0, 10) < today()) return false;
  return true;
}

function applyFilters(list: Announcement[], filters: AnnouncementFilters): Announcement[] {
  let result = [...list];

  if (filters.query) {
    const q = filters.query.toLowerCase();
    result = result.filter((a) =>
      [a.title, a.description, a.body, a.authorName].join(" ").toLowerCase().includes(q),
    );
  }
  if (filters.status && filters.status !== "all") {
    result = result.filter((a) => a.status === filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    result = result.filter((a) => a.priority === filters.priority);
  }

  const key = filters.sort ?? "publishedAt";
  const direction = filters.order === "desc" ? -1 : 1;
  result.sort((a, b) => {
    if (key === "priority") return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * direction;
    if (key === "title") return a.title.localeCompare(b.title) * direction;
    return (a.publishedAt < b.publishedAt ? -1 : 1) * direction;
  });

  return result;
}

export async function listNoticesForEmployee(employeeId: string): Promise<NoticeSummary[]> {
  await simulateLatency(180);
  return db.announcements
    .filter(isVisible)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      publishedAt: a.publishedAt,
      authorName: a.authorName,
      priority: a.priority,
      isRead: a.readBy.includes(employeeId),
    }));
}

export async function getNoticeForEmployee(id: string, employeeId: string) {
  await simulateLatency(120);
  const announcement = db.announcements.find((a) => a.id === id);
  if (!announcement || !isVisible(announcement)) return null;
  return { announcement, isRead: announcement.readBy.includes(employeeId) };
}

export async function getUnreadNoticeCount(employeeId: string): Promise<number> {
  await simulateLatency(70);
  return db.announcements.filter((a) => isVisible(a) && !a.readBy.includes(employeeId)).length;
}

export async function markNoticeRead(id: string, employeeId: string): Promise<boolean> {
  await requireActionRole("employee", "admin");
  const announcement = db.announcements.find((a) => a.id === id);
  if (!announcement) return false;
  if (!announcement.readBy.includes(employeeId)) {
    announcement.readBy.push(employeeId);
  }
  return true;
}

export async function listAllAnnouncements(filters: AnnouncementFilters = {}): Promise<Announcement[]> {
  await simulateLatency(200);
  return applyFilters(db.announcements, filters);
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  await simulateLatency(80);
  return db.announcements.find((a) => a.id === id) ?? null;
}

export async function getRecentAnnouncements(limit = 4): Promise<Announcement[]> {
  await simulateLatency(130);
  return db.announcements
    .filter(isVisible)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1))
    .slice(0, limit);
}

export interface AnnouncementInput {
  title: string;
  description: string;
  body: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string;
  expiresAt: string | null;
}

export async function createAnnouncement(input: AnnouncementInput, actor: AuthUser): Promise<Announcement> {
  await requireActionRole("admin");
  await simulateLatency(340);

  const announcement: Announcement = {
    id: nextId("ann"),
    title: input.title.trim(),
    description: input.description.trim(),
    body: input.body.trim(),
    authorId: actor.id,
    authorName: actor.name,
    priority: input.priority,
    status: input.status,
    publishedAt: new Date(input.publishedAt).toISOString(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
    readBy: [],
  };

  db.announcements.unshift(announcement);
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/notices");
  return announcement;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<Announcement | null> {
  await requireActionRole("admin");
  await simulateLatency(340);

  const announcement = db.announcements.find((a) => a.id === id);
  if (!announcement) return null;

  Object.assign(announcement, {
    title: input.title.trim(),
    description: input.description.trim(),
    body: input.body.trim(),
    priority: input.priority,
    status: input.status,
    publishedAt: new Date(input.publishedAt).toISOString(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
  });

  revalidatePath("/admin/announcements");
  revalidatePath("/employee/notices");
  return announcement;
}

export async function setAnnouncementStatus(
  id: string,
  status: AnnouncementStatus,
): Promise<Announcement | null> {
  await requireActionRole("admin");
  await simulateLatency(240);
  const announcement = db.announcements.find((a) => a.id === id);
  if (!announcement) return null;
  announcement.status = status;
  revalidatePath("/admin/announcements");
  revalidatePath("/employee/notices");
  return announcement;
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  await requireActionRole("admin");
  await simulateLatency(280);
  const index = db.announcements.findIndex((a) => a.id === id);
  if (index === -1) return false;
  db.announcements.splice(index, 1);
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/notices");
  return true;
}
