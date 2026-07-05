// Fetches published studio-authored blog posts from Cloudflare KV and writes
// src/data/kv-posts.json for the static build. Runs via package.json "prebuild".
// No creds (local dev) -> keeps the existing file. Creds present but API fails
// -> exits nonzero so CI fails instead of silently unpublishing posts.
import { writeFile } from "node:fs/promises";

const NS = "a5d099e3d9be4694859a6dbf009dd095";
const OUT = "src/data/kv-posts.json";
const token = process.env.KV_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;

if (!token || !account) {
  console.log("fetch-kv-posts: no Cloudflare creds; keeping existing kv-posts.json");
  process.exit(0);
}

async function kvGet(key) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${NS}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`KV read ${key} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

const publishedIds = (await kvGet("blog:published")) ?? [];
const posts = [];
for (const id of publishedIds) {
  const d = await kvGet(`blogdraft:${id}`);
  if (!d || d.status !== "published" || !d.polished || !d.publishedAt) continue;
  const p = d.polished;
  let content = p.contentHtml;
  if (d.heroImageKey) {
    const alt = p.title.replace(/"/g, "&quot;");
    content = `<p><img src="/media/${d.heroImageKey}" alt="${alt}" style="width:100%;border-radius:12px;" /></p>` + content;
  }
  const words = p.contentHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  posts.push({
    slug: d.slug,
    title: p.title,
    excerpt: p.excerpt,
    category: d.category,
    date: d.publishedAt,
    readTime: `${Math.max(1, Math.ceil(words / 200))} min read`,
    metaDescription: p.metaDescription,
    keywords: p.keywords,
    content,
    videoScript: p.videoScript,
    youtubeEmbed: "",
  });
}
posts.sort((a, b) => b.date.localeCompare(a.date));
await writeFile(OUT, JSON.stringify(posts, null, 2) + "\n");
console.log(`fetch-kv-posts: wrote ${posts.length} post(s) to ${OUT}`);
