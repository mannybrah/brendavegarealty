import { BlogDraftPolished } from "./blogStudio";

const VOICE = `You are the ghostwriter for Brenda Vega, a Real Broker real estate agent based in Campbell, California, serving the South Bay (Campbell, San Jose, Los Gatos, Saratoga, Cupertino, Santa Clara) and Northern California.

Voice and structure rules, learned from her existing blog:
- First person, warm but expert. She often introduces herself early: "I'm Brenda Vega, your South Bay Realtor with Real Broker."
- Specific and concrete: real street names, neighborhoods, and school districts.
- Use <h2> section headings (never <h1>), <p> paragraphs, <ul><li> lists, and <strong> for key takeaways. No inline styles, no images, no scripts.
- Always end with a personal call-to-action paragraph inviting the reader to reach out via brendavegarealty.com.`;

// Step 1 — the article itself is generated as plain HTML, never wrapped in
// JSON: long LLM outputs reliably break JSON string escaping, and structured
// output mode produces articles far below the length target.
export const ARTICLE_SYSTEM = `${VOICE}

Write the full blog post now: 900-1300 words of HTML. Respond with ONLY the article HTML — no JSON, no markdown fences, no <h1> or title heading (the title renders separately), no preamble or closing commentary.`;

export function buildArticlePrompt(draft: { title: string; category: string; rawNotes: string }): string {
  return `Write a blog post for Brenda's website.

Working title: ${draft.title}
Category: ${draft.category}
Today's context: this will publish on her blog at brendavegarealty.com.

Brenda's rough notes (expand these into the full post; keep every specific fact she mentions, invent nothing that contradicts them):
---
${draft.rawNotes}
---

Write the full article HTML now.`;
}

export function parseArticleHtml(text: string): string {
  let raw = text.trim();
  const fence = raw.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/);
  if (fence) raw = fence[1].trim();
  const start = raw.indexOf("<");
  if (start === -1) throw new Error("no HTML in article response");
  raw = raw.slice(start).trim();
  if (!/<h2[\s>]/i.test(raw) || !/<p[\s>]/i.test(raw)) throw new Error("article missing expected structure");
  const words = raw.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  if (words < 400) throw new Error(`article too short (${words} words)`);
  return sanitizeContentHtml(raw);
}

// Step 2 — metadata is small and shape-critical, so it uses structured
// outputs (guaranteed-valid JSON against this schema).
export const META_SYSTEM = `${VOICE}

You will be given a finished blog article. Produce its metadata.`;

export function buildMetaPrompt(draft: { title: string; category: string }, articleHtml: string): string {
  return `The finished article for Brenda's blog (working title: "${draft.title}", category: ${draft.category}):
---
${articleHtml}
---

Produce the metadata: final title, excerpt (1-2 sentences), metaDescription (max 155 chars), keywords (5-8 SEO phrases), and videoScript — a 30-60 second YouTube Short script in Brenda's first-person voice with [HOOK - first 3 seconds], [BODY], and [CTA] sections.`;
}

export const META_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    excerpt: { type: "string", description: "1-2 sentences" },
    metaDescription: { type: "string", description: "max 155 characters" },
    keywords: { type: "array", items: { type: "string" }, description: "5-8 SEO phrases" },
    videoScript: {
      type: "string",
      description: "30-60 second YouTube Short script with [HOOK - first 3 seconds], [BODY], [CTA] sections",
    },
  },
  required: ["title", "excerpt", "metaDescription", "keywords", "videoScript"],
  additionalProperties: false,
} as const;

export function parseMetaResponse(text: string): Omit<BlogDraftPolished, "contentHtml"> {
  const obj = JSON.parse(text) as Record<string, unknown>;
  for (const key of ["title", "excerpt", "metaDescription", "videoScript"]) {
    if (typeof obj[key] !== "string" || !(obj[key] as string).trim()) {
      throw new Error(`missing field: ${key}`);
    }
  }
  if (!Array.isArray(obj.keywords) || obj.keywords.some((k) => typeof k !== "string")) {
    throw new Error("missing field: keywords");
  }
  return {
    title: obj.title as string,
    excerpt: obj.excerpt as string,
    metaDescription: (obj.metaDescription as string).slice(0, 160),
    keywords: obj.keywords as string[],
    videoScript: obj.videoScript as string,
  };
}

export function sanitizeContentHtml(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}
