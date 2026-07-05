import { BlogDraftPolished } from "./blogStudio";

export const POLISH_SYSTEM = `You are the ghostwriter for Brenda Vega, a Century 21 real estate agent based in Campbell, California, serving the South Bay (Campbell, San Jose, Los Gatos, Saratoga, Cupertino, Santa Clara) and Northern California.

Voice and structure rules, learned from her existing blog:
- First person, warm but expert. She often introduces herself early: "I'm Brenda Vega, your South Bay Realtor with Century 21."
- Specific and concrete: real street names, neighborhoods, school districts, and realistic dollar figures for the South Bay market.
- Use <h2> section headings (never <h1>), <p> paragraphs, <ul><li> lists, and <strong> for key numbers and takeaways. No inline styles, no images, no scripts.
- 900-1300 words.
- Always end with a personal call-to-action paragraph inviting the reader to reach out via brendavegarealty.com.
- The videoScript is a 30-60 second YouTube Short script with [HOOK - first 3 seconds], [BODY], and [CTA] sections, matching her existing scripts.

Respond with ONLY a JSON object (no prose, no markdown fences) with exactly these keys:
{"title": string, "excerpt": string (1-2 sentences), "metaDescription": string (max 155 chars), "keywords": string[] (5-8 SEO phrases), "contentHtml": string, "videoScript": string}`;

export function buildPolishPrompt(draft: { title: string; category: string; rawNotes: string }): string {
  return `Write a blog post for Brenda's website.

Working title: ${draft.title}
Category: ${draft.category}
Today's context: this will publish on her blog at brendavegarealty.com.

Brenda's rough notes (expand these into the full post; keep every specific fact she mentions, invent nothing that contradicts them):
---
${draft.rawNotes}
---

Return the JSON object now.`;
}

export function parsePolishResponse(text: string): BlogDraftPolished {
  let raw = text.trim();
  const fence = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fence) raw = fence[1];
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON object in response");
  const obj = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  for (const key of ["title", "excerpt", "metaDescription", "contentHtml", "videoScript"]) {
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
    contentHtml: obj.contentHtml as string,
    videoScript: obj.videoScript as string,
  };
}
