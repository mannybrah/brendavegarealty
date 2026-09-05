import { slugify } from "./blogStudio";
import { sanitizeContentHtml } from "./blogPolish";

export const LISTING_STATUSES = ["just-listed", "open-house", "pending", "sold"] as const;
export type ListingStatus = (typeof LISTING_STATUSES)[number];

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  "just-listed": "Just Listed",
  "open-house": "Open House",
  pending: "Pending",
  sold: "Sold",
};

export interface OpenHouse {
  date: string; // YYYY-MM-DD
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface Listing {
  id: string;
  slug: string;
  status: ListingStatus;
  address: string;
  city: string;
  price: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize?: string;
  description: string;
  features: string[];
  photoKeys: string[];
  coverIndex: number;
  openHouses: OpenHouse[];
  sourceUrl: string;
  publishedAt?: string; // YYYY-MM-DD Pacific
  createdAt: string;
  updatedAt: string;
  live: boolean;
}

// ============================================================
// Photo extraction (Rela-hosted marketing sites)
// ============================================================

const PHOTO_CAP = 30;

// Rela pages embed the same photo URLs multiple times (og:image, hero,
// gallery, and a JSON blob for the lightbox where "/" is escaped as "\/").
// Normalize escaped slashes first so a single regex catches every form.
export function extractRelaPhotoUrls(html: string): string[] {
  const unescaped = html.replace(/\\\//g, "/");
  const matches = unescaped.match(/https?:\/\/media\.relahq\.com\/[^\s"'<>\\]+/g) ?? [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of matches) {
    // Trim trailing punctuation/CSS artifacts picked up by the regex, e.g. `);` or `",`
    let url = raw.replace(/[)"',;]+$/g, "");
    if (!/\/property-images\//.test(url)) continue;
    if (/agent-headshots|agent_card|favicon|wl_footer_logos|property-docs/i.test(url)) continue;

    // Strip query string
    url = url.split("?")[0];
    // Normalize any style-variant segment to the largest available (kb_full)
    url = url.replace(/\/styles\/[a-z0-9_]+\/s3\//i, "/styles/kb_full/s3/");

    if (seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= PHOTO_CAP) break;
  }
  return out;
}

// ============================================================
// Slug
// ============================================================

export function listingSlug(address: string, city?: string): string {
  const slug = slugify(address);
  if (slug) return slug;
  return city ? slugify(city) : "listing";
}

// ============================================================
// Open houses
// ============================================================

export function futureOpenHouses(openHouses: OpenHouse[], todayPacific: string): OpenHouse[] {
  return openHouses
    .filter((oh) => oh.date >= todayPacific)
    .slice()
    .sort((a, b) => (a.date === b.date ? a.start.localeCompare(b.start) : a.date.localeCompare(b.date)));
}

// ============================================================
// HTML -> plain text (for feeding the extraction prompt)
// ============================================================

export function stripHtmlToText(html: string, maxChars = 40000): string {
  const text = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, maxChars);
}

// ============================================================
// AI extraction (structured outputs)
// ============================================================

export const EXTRACT_SYSTEM = `You extract real-estate listing facts from the on-page text of a single-property marketing website (built on the Rela platform) for Brenda Vega, a Real Broker REALTOR serving Campbell, San Jose, and the South Bay / Northern California.

Read the page text and pull out only what is actually stated: address, city, price, beds, baths, sqft, lot size, description, and features. Never invent numbers, amenities, or upgrades that aren't in the text. If a field isn't present, use an empty string ("") for text fields, an empty array for features, or null for numbers.

The description should be 1-3 short plain-text paragraphs (no HTML tags, no markdown) written in a warm, professional real-estate voice, summarizing the home using only facts from the source text.`;

export function buildExtractPrompt(pageText: string): string {
  return `Page text from the listing marketing site:
---
${pageText}
---

Extract the listing fields now.`;
}

export const EXTRACT_OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    address: { type: "string", description: "Street address, e.g. '15540 Armsby Ln'. Empty string if unknown." },
    city: { type: "string", description: "City name, e.g. 'Morgan Hill'. Empty string if unknown." },
    price: { type: "string", description: "Formatted price like '$1,595,000'. Empty string if no price is listed." },
    beds: { type: ["number", "null"], description: "Number of bedrooms, or null if unknown." },
    baths: { type: ["number", "null"], description: "Number of bathrooms (may be fractional), or null if unknown." },
    sqft: { type: ["number", "null"], description: "Living area in square feet, or null if unknown." },
    lotSize: { type: "string", description: "e.g. '1.8 acres' or '82,328 sf'. Empty string if unknown." },
    description: { type: "string", description: "1-3 plain-text paragraphs, no HTML." },
    features: { type: "array", items: { type: "string" }, description: "Short feature/amenity bullet phrases." },
  },
  required: ["address", "city", "price", "beds", "baths", "sqft", "lotSize", "description", "features"],
  additionalProperties: false,
} as const;

export interface ExtractedListingFields {
  address: string;
  city: string;
  price: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lotSize: string;
  description: string;
  features: string[];
}

export function parseExtractResponse(text: string): ExtractedListingFields {
  const obj = JSON.parse(text) as Record<string, unknown>;

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

  if (typeof obj.address !== "string") throw new Error("missing field: address");
  if (typeof obj.city !== "string") throw new Error("missing field: city");
  if (typeof obj.description !== "string") throw new Error("missing field: description");
  if (!Array.isArray(obj.features)) throw new Error("missing field: features");

  const features = obj.features
    .filter((f): f is string => typeof f === "string")
    .map((f) => f.trim())
    .filter(Boolean);

  return {
    address: str(obj.address),
    city: str(obj.city),
    price: str(obj.price),
    beds: num(obj.beds),
    baths: num(obj.baths),
    sqft: num(obj.sqft),
    lotSize: str(obj.lotSize),
    description: sanitizeContentHtml(str(obj.description)),
    features,
  };
}
