export const BLOG_CATEGORIES = ["Buying", "Selling", "Market Update", "Neighborhoods"] as const;

export interface BlogDraftPolished {
  title: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  contentHtml: string;
  videoScript: string;
}

export interface BlogDraft {
  id: string;
  slug: string;
  title: string;
  category: string;
  rawNotes: string;
  heroImageKey?: string;
  imageKeys?: string[];
  videoUrl?: string;
  polished?: BlogDraftPolished;
  status: "draft" | "polished" | "published";
  createdAt: string;
  publishedAt?: string; // YYYY-MM-DD Pacific
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function readTimeFromHtml(html: string): string {
  const words = html.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 200))} min read`;
}

export function isYouTubeUrl(url: string): boolean {
  return /^https?:\/\/(www\.)?(youtube\.com\/(watch\?|shorts\/|embed\/)|youtu\.be\/)/.test(url.trim());
}
