export const FEED_TYPES = ["update", "just-listed", "just-sold", "open-house"] as const;
export type FeedType = (typeof FEED_TYPES)[number];

export const FEED_TYPE_LABELS: Record<FeedType, string> = {
  update: "Update",
  "just-listed": "Just Listed",
  "just-sold": "Just Sold",
  "open-house": "Open House",
};

export interface FeedPost {
  id: string;
  type: FeedType;
  caption: string;
  imageKeys: string[];
  link?: string;
  createdAt: string; // ISO
}

export interface Announcement {
  text: string;
  link?: string;
  active: boolean;
  updatedAt: string; // ISO
}

export interface HomeState {
  announcement: Announcement | null;
  feedPosts: FeedPost[];
}

export function validateFeedInput(
  body: unknown
): { ok: true; value: { type: FeedType; caption: string; imageKeys: string[]; link?: string } } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "bad body" };
  const b = body as Record<string, unknown>;
  if (typeof b.type !== "string" || !(FEED_TYPES as readonly string[]).includes(b.type)) {
    return { ok: false, error: "invalid type" };
  }
  const caption = typeof b.caption === "string" ? b.caption.trim() : "";
  if (caption.length > 1000) return { ok: false, error: "caption too long" };
  const imageKeys = Array.isArray(b.imageKeys) ? b.imageKeys.filter((k): k is string => typeof k === "string") : [];
  if (imageKeys.length > 4) return { ok: false, error: "max 4 images" };
  if (!caption && imageKeys.length === 0) return { ok: false, error: "caption or image required" };
  const link = typeof b.link === "string" ? b.link.trim() : "";
  if (link && (link.length > 300 || !(link.startsWith("/") || /^https?:\/\//.test(link)))) {
    return { ok: false, error: "invalid link" };
  }
  return { ok: true, value: { type: b.type as FeedType, caption, imageKeys, ...(link ? { link } : {}) } };
}

export function relativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const sec = Math.max(0, (now.getTime() - then.getTime()) / 1000);
  if (sec < 3600) return `${Math.max(1, Math.floor(sec / 60))}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 7 * 86400) return `${Math.floor(sec / 86400)}d ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
