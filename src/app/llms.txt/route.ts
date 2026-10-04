import { siteConfig } from "@/data/site";
import { areas } from "@/data/areas";
import { services, DRE_LOOKUP_URL, SERVICE_AREA_TEXT } from "@/data/services";
import { getVisiblePosts } from "@/lib/visiblePosts";

// Static export: rendered once at build time to out/llms.txt.
export const dynamic = "force-static";

const SITE_URL = `https://${siteConfig.domain}`;

/**
 * /llms.txt — a plain-markdown summary of who Brenda is and where the useful pages
 * live, for AI assistants that read it. Generated from the same data the site renders
 * so it cannot drift from the pages. Rules: only facts stated elsewhere on the site,
 * no home prices or market statistics, and only blog posts that are publicly listed
 * (future-dated posts appear after the daily rebuild on their publish date).
 */
// Older posts kept out of llms.txt (they stay on the blog): school-quality or
// family-targeted framing that does not belong in a summary an assistant may quote
// (Fair Housing), a pricing-led title, and an event that has passed.
const LLMS_EXCLUDED_SLUGS = new Set([
  "best-schools-campbell-ca",
  "willow-glen-vs-rose-garden-san-jose-families",
  "almaden-valley-san-jose-family-secret",
  "cupertino-homes-apple-park-proximity-price",
  "free-easter-egg-hunt-2026",
]);

export function GET() {
  const { agent } = siteConfig;
  // Titles only, and nothing that quotes a price, a percentage or market numbers.
  const posts = getVisiblePosts().filter(
    (p) => p.category !== "Market Update" && !/[$%]/.test(p.title) && !LLMS_EXCLUDED_SLUGS.has(p.slug)
  );
  const categories = [...new Set(posts.map((p) => p.category))];

  const lines: string[] = [
    `# ${siteConfig.name}`,
    "",
    `> ${agent.name} is a ${agent.title} with ${agent.brokerage} (California DRE #${agent.dre}) who represents home buyers and sellers in ${SERVICE_AREA_TEXT}. Her primary area is Campbell, California.`,
    "",
    "## Key facts",
    "",
    `- Agent: ${agent.name}, ${agent.title}`,
    `- Brokerage: ${agent.brokerage}`,
    `- License: California DRE #${agent.dre}; verify at ${DRE_LOOKUP_URL}`,
    "- Primary area: Campbell, California",
    `- Areas served: ${SERVICE_AREA_TEXT}`,
    "- Works with: home buyers (including first-time buyers and investors) and home sellers",
    `- Phone: ${agent.phone}`,
    `- Email: ${agent.email}`,
    `- Free consultation by phone, video or in person: ${SITE_URL}/contact`,
    "",
    "## What she helps with",
    "",
    ...services.map((s) => `- [${s.title}](${SITE_URL}/services/${s.slug}): ${s.answer}`),
    "",
    "## Areas served",
    "",
    ...areas.map((a) => `- [${a.name}, CA](${SITE_URL}/areas/${a.slug})`),
    "",
    "## Key pages",
    "",
    `- [About ${agent.name}](${SITE_URL}/about)`,
    `- [Services](${SITE_URL}/services)`,
    `- [Areas served](${SITE_URL}/areas)`,
    `- [Listings](${SITE_URL}/listings)`,
    `- [Blog](${SITE_URL}/blog)`,
    `- [Contact and consultation booking](${SITE_URL}/contact)`,
    "",
    "## Blog articles",
  ];

  for (const category of categories) {
    lines.push("", `### ${category}`, "");
    for (const p of posts.filter((x) => x.category === category)) {
      lines.push(`- [${p.title}](${SITE_URL}/blog/${p.slug})`);
    }
  }
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
