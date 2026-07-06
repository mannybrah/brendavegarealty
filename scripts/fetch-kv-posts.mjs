// Fetches published studio-authored blog posts from Cloudflare KV and writes
// src/data/kv-posts.json for the static build. Runs via package.json "prebuild".
// Reads KV via the REST API when CI creds are set, else via the locally
// authenticated wrangler CLI. A local build MUST NOT silently produce an
// empty file when posts exist in KV — deploying such a build unpublishes
// them — so with no working credential source at all it keeps the existing
// file, and any read failure exits nonzero.
import { writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const NS = "a5d099e3d9be4694859a6dbf009dd095";
const OUT = "src/data/kv-posts.json";
const token = process.env.KV_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;

async function kvGetRest(key) {
  const r = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${NS}/values/${encodeURIComponent(key)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`KV read ${key} failed: ${r.status} ${await r.text()}`);
  return r.json();
}

function kvGetWrangler(key) {
  try {
    const out = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["wrangler", "kv", "key", "get", `--namespace-id=${NS}`, "--remote", key],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }
    ).trim();
    if (!out) return null;
    return JSON.parse(out);
  } catch (err) {
    const msg = String(err.stderr || err.message || err);
    if (/not found|10009/i.test(msg)) return null; // key doesn't exist yet
    throw new Error(`wrangler KV read ${key} failed: ${msg.slice(0, 200)}`);
  }
}

let kvGet;
if (token && account) {
  kvGet = kvGetRest;
} else {
  // Local build: fall back to the wrangler CLI (OAuth login). Probe once so a
  // machine with no credentials at all keeps the existing file instead of
  // failing every local build.
  try {
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["wrangler", "whoami"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }
    );
    kvGet = kvGetWrangler;
    console.log("fetch-kv-posts: using wrangler CLI auth (local build)");
  } catch {
    console.log("fetch-kv-posts: no Cloudflare creds; keeping existing kv-posts.json");
    process.exit(0);
  }
}


// Distribute article photos evenly between paragraphs (after the intro).
function injectImages(content, imageKeys) {
  if (!imageKeys || imageKeys.length === 0) return content;
  const parts = content.split("</p>");
  const paraCount = parts.length - 1;
  if (paraCount < 2) {
    return content + imageKeys.map((k) =>
      `<p><img src="/media/${k}" alt="" loading="lazy" style="width:100%;border-radius:8px;" /></p>`
    ).join("");
  }
  const n = imageKeys.length;
  const positions = imageKeys.map((_, i) => Math.max(1, Math.round(((i + 1) * paraCount) / (n + 1))));
  let out = "";
  parts.forEach((part, idx) => {
    out += part + (idx < paraCount ? "</p>" : "");
    positions.forEach((pos, i) => {
      if (pos === idx + 1) {
        out += `<p><img src="/media/${imageKeys[i]}" alt="" loading="lazy" style="width:100%;border-radius:8px;" /></p>`;
      }
    });
  });
  return out;
}

const publishedIds = (await kvGet("blog:published")) ?? [];
const posts = [];
for (const id of publishedIds) {
  const d = await kvGet(`blogdraft:${id}`);
  if (!d || d.status !== "published" || !d.polished || !d.publishedAt) continue;
  const p = d.polished;
  let content = injectImages(p.contentHtml, d.imageKeys);
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
    youtubeEmbed: d.videoUrl || "",
  });
}
posts.sort((a, b) => b.date.localeCompare(a.date));
await writeFile(OUT, JSON.stringify(posts, null, 2) + "\n");
console.log(`fetch-kv-posts: wrote ${posts.length} post(s) to ${OUT}`);
