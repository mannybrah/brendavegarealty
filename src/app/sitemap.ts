import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";
import { areas } from "@/data/areas";
import { services } from "@/data/services";
import { getVisiblePosts } from "@/lib/visiblePosts";

// Static export: rendered once at build time to out/sitemap.xml. Replaces the old
// hand-maintained public/sitemap.xml so area, service and blog URLs cannot drift.
// Blog posts are listed only once publicly visible (same rule as /blog), so the
// daily rebuild adds scheduled posts on their publish date.
export const dynamic = "force-static";

const SITE_URL = `https://${siteConfig.domain}`;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, priority: 1.0 },
    { url: `${SITE_URL}/about`, priority: 0.8 },
    { url: `${SITE_URL}/services`, priority: 0.8 },
    ...services.map((s) => ({ url: `${SITE_URL}/services/${s.slug}`, priority: 0.8 })),
    { url: `${SITE_URL}/listings`, priority: 0.9 },
    { url: `${SITE_URL}/testimonials`, priority: 0.7 },
    { url: `${SITE_URL}/home-clarity`, priority: 0.9 },
    { url: `${SITE_URL}/areas`, priority: 0.8 },
    ...areas.map((a) => ({ url: `${SITE_URL}/areas/${a.slug}`, priority: 0.7 })),
    { url: `${SITE_URL}/blog`, priority: 0.8 },
    ...getVisiblePosts().map((p) => ({ url: `${SITE_URL}/blog/${p.slug}`, lastModified: p.date, priority: 0.6 })),
    { url: `${SITE_URL}/contact`, priority: 0.9 },
    { url: `${SITE_URL}/privacy`, priority: 0.3 },
  ];
}
