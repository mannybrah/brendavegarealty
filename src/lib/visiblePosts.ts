import { blogPosts, type BlogPost } from "@/data/blog-posts";

/**
 * Posts that are publicly listed at build time. Same rule as /blog: post.date is a
 * Pacific YYYY-MM-DD string, compared as a string against today's Pacific date, so
 * future-dated (scheduled) posts stay out of llms.txt, the sitemap and link lists
 * until the daily rebuild on their publish date.
 */
export function getVisiblePosts(): BlogPost[] {
  const todayPacific = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  return blogPosts.filter((p) => p.date <= todayPacific);
}
