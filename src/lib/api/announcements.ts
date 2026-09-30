import "server-only";

import { and, asc, count, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { announcementAuthor, announcementSelection } from "@/lib/db/selects";
import { likePattern } from "@/lib/db/query-helpers";
import { announcementReads, announcements } from "@/lib/db/schema";
import { toAnnouncement } from "@/lib/db/mappers";
import { requireActionRole } from "@/lib/auth/actions";
import { today } from "@/lib/format";
import type { AuthUser } from "@/types/auth";
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementStatus,
  NoticeSummary,
} from "@/types/announcement";

export interface AnnouncementFilters {
  query?: string;
  status?: AnnouncementStatus | "all";
  priority?: AnnouncementPriority | "all";
  sort?: "publishedAt" | "priority" | "title";
  order?: "asc" | "desc";
}

const searchBlob = sql`concat_ws(' ', ${announcements.title}, ${announcements.description}, ${announcements.body})`;

/**
 * A notice reaches an employee only while it is published and not expired.
 * Expiry is compared on the calendar date, not the timestamp, so a notice that
 * expires at 00:00 today still shows for the rest of the day — which is what
 * the previous `expiresAt.slice(0, 10) < today()` comparison did.
 */
const visibleToEmployees = and(
  eq(announcements.status, "published"),
  or(
    isNull(announcements.expiresAt),
    sql`${announcements.expiresAt}::date >= ${today()}`,
  ),
);

const hasRead = (employeeId: string) => sql<boolean>`exists (
  select 1 from ${announcementReads}
  where ${announcementReads.announcementId} = ${announcements.id}
    and ${announcementReads.employeeId} = ${employeeId}
)`;

function priorityRank() {
  return sql<number>`case ${announcements.priority}
    when 'urgent' then 4
    when 'high' then 3
    when 'normal' then 2
    else 1
  end`;
}

export async function listNoticesForEmployee(employeeId: string): Promise<NoticeSummary[]> {
  const rows = await db
    .select({
      id: announcements.id,
      title: announcements.title,
      description: announcements.description,
      publishedAt: announcements.publishedAt,
      authorName: sql<string>`coalesce(${announcementAuthor.fullName}, 'Unknown')`.as("author_name"),
      priority: announcements.priority,
      isRead: hasRead(employeeId),
    })
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(visibleToEmployees)
    .orderBy(desc(announcements.publishedAt));

  return rows;
}

export async function getNoticeForEmployee(id: string, employeeId: string) {
  const rows = await db
    .select({
      ...announcementSelection,
      isRead: hasRead(employeeId),
    })
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(and(eq(announcements.id, id), visibleToEmployees))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return { announcement: toAnnouncement(row), isRead: row.isRead };
}

/**
 * Counted in SQL with a `NOT EXISTS` anti-join rather than by loading every
 * notice and testing `readBy` in JavaScript.
 */
export async function getUnreadNoticeCount(employeeId: string): Promise<number> {
  const rows = await db
    .select({ total: count() })
    .from(announcements)
    .where(
      and(
        visibleToEmployees,
        sql`not exists (
          select 1 from ${announcementReads}
          where ${announcementReads.announcementId} = ${announcements.id}
            and ${announcementReads.employeeId} = ${employeeId}
        )`,
      ),
    );

  return rows[0]?.total ?? 0;
}

export async function markNoticeRead(id: string, employeeId: string): Promise<boolean> {
  await requireActionRole("employee", "admin");

  const existing = await db
    .select({ id: announcements.id })
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  if (existing.length === 0) return false;

  // The composite primary key makes a repeat read a no-op rather than a duplicate.
  await db
    .insert(announcementReads)
    .values({ announcementId: id, employeeId })
    .onConflictDoNothing();

  return true;
}

function buildFilters(filters: AnnouncementFilters) {
  const conditions = [];

  if (filters.query) {
    conditions.push(ilike(searchBlob, likePattern(filters.query)));
  }
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(announcements.status, filters.status));
  }
  if (filters.priority && filters.priority !== "all") {
    conditions.push(eq(announcements.priority, filters.priority));
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function orderFor(sort: AnnouncementFilters["sort"], order: "asc" | "desc" | undefined) {
  // The admin list has always sorted oldest-first by default.
  const direction = order === "desc" ? desc : asc;
  if (sort === "priority") return [direction(priorityRank()), desc(announcements.publishedAt)];
  if (sort === "title") return [direction(announcements.title)];
  return [direction(announcements.publishedAt)];
}

export async function listAllAnnouncements(filters: AnnouncementFilters = {}): Promise<Announcement[]> {
  const rows = await db
    .select(announcementSelection)
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(buildFilters(filters))
    .orderBy(...orderFor(filters.sort, filters.order));

  return rows.map(toAnnouncement);
}

export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const rows = await db
    .select(announcementSelection)
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(eq(announcements.id, id))
    .limit(1);

  const row = rows[0];
  return row ? toAnnouncement(row) : null;
}

export async function getRecentAnnouncements(limit = 4): Promise<Announcement[]> {
  const rows = await db
    .select(announcementSelection)
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(visibleToEmployees)
    .orderBy(desc(announcements.publishedAt))
    .limit(limit);

  return rows.map(toAnnouncement);
}

/**
 * Recent announcements annotated with whether a specific person has read each
 * one. The admin dashboard shows real read state rather than assuming every
 * notice has been seen.
 */
export async function getRecentAnnouncementsWithRead(
  employeeId: string,
  limit = 4,
): Promise<Array<Announcement & { isRead: boolean }>> {
  const rows = await db
    .select({ ...announcementSelection, isRead: hasRead(employeeId) })
    .from(announcements)
    .leftJoin(announcementAuthor, eq(announcements.authorId, announcementAuthor.id))
    .where(visibleToEmployees)
    .orderBy(desc(announcements.publishedAt))
    .limit(limit);

  return rows.map((row) => ({ ...toAnnouncement(row), isRead: row.isRead }));
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

/** Normalises a form datetime into an absolute instant before it is stored. */
function toInstant(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function createAnnouncement(
  input: AnnouncementInput,
  actor: AuthUser,
): Promise<Announcement> {
  await requireActionRole("admin");

  const inserted = await db
    .insert(announcements)
    .values({
      title: input.title.trim(),
      description: input.description.trim(),
      body: input.body.trim(),
      authorId: actor.id,
      priority: input.priority,
      status: input.status,
      publishedAt: toInstant(input.publishedAt) ?? new Date().toISOString(),
      expiresAt: toInstant(input.expiresAt),
    })
    .returning({ id: announcements.id });

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/notices");

  const created = await getAnnouncementById(inserted[0]!.id);
  if (!created) throw new Error("The announcement could not be read back after creation.");
  return created;
}

export async function updateAnnouncement(
  id: string,
  input: AnnouncementInput,
): Promise<Announcement | null> {
  await requireActionRole("admin");

  const updated = await db
    .update(announcements)
    .set({
      title: input.title.trim(),
      description: input.description.trim(),
      body: input.body.trim(),
      priority: input.priority,
      status: input.status,
      publishedAt: toInstant(input.publishedAt) ?? new Date().toISOString(),
      expiresAt: toInstant(input.expiresAt),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });

  if (updated.length === 0) return null;

  revalidatePath("/admin/announcements");
  revalidatePath("/employee/notices");

  return getAnnouncementById(id);
}

export async function setAnnouncementStatus(
  id: string,
  status: AnnouncementStatus,
): Promise<Announcement | null> {
  await requireActionRole("admin");

  const updated = await db
    .update(announcements)
    .set({ status, updatedAt: new Date().toISOString() })
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });

  if (updated.length === 0) return null;

  revalidatePath("/admin/announcements");
  revalidatePath("/employee/notices");

  return getAnnouncementById(id);
}

/** Read receipts cascade with the announcement, so nothing is left dangling. */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  await requireActionRole("admin");

  const deleted = await db
    .delete(announcements)
    .where(eq(announcements.id, id))
    .returning({ id: announcements.id });

  if (deleted.length === 0) return false;

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/dashboard");
  revalidatePath("/employee/notices");
  return true;
}