export type AnnouncementPriority = "low" | "normal" | "high" | "urgent";

export type AnnouncementStatus = "published" | "draft" | "archived";

export interface Announcement {
  id: string;
  title: string;
  description: string;
  body: string;
  authorId: string;
  authorName: string;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string;
  expiresAt: string | null;
  readBy: string[];
}

export interface NoticeSummary {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  authorName: string;
  priority: AnnouncementPriority;
  isRead: boolean;
}
