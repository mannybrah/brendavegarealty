export const SYSTEM_STAGE_IDS = ["new", "active", "under_contract", "closed", "archived"] as const;
export type SystemStageId = (typeof SYSTEM_STAGE_IDS)[number];

export const PALETTE_KEYS = [
  "gold",
  "coral",
  "steel",
  "plum",
  "teal",
  "sage",
  "amber",
  "green",
  "stone",
  "gray",
  "navy",
] as const;
export type PaletteKey = (typeof PALETTE_KEYS)[number];

export function isSystemStage(id: string): boolean {
  return (SYSTEM_STAGE_IDS as readonly string[]).includes(id);
}

export function isPaletteKey(v: unknown): v is PaletteKey {
  return typeof v === "string" && (PALETTE_KEYS as readonly string[]).includes(v);
}

export function slugifyStageName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug || "stage";
}

export function nextStageId(existing: string[], name: string): string {
  const base = slugifyStageName(name);
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
