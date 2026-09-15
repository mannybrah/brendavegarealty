import { PaletteKey } from "@/lib/crm/stages";

// Single source of truth for the CRM color system. Keys are palette names
// (stored on `stages.color`, also used for avatars), NOT stage ids — stages
// are dynamic now. `bg`/`text`/`border` are Tailwind classes for pills and
// tints; `accent` is the raw hex for inline styles (column top borders,
// timeline dots); `solid` is a filled-chip pair tuned to clear WCAG AA.
export interface StageColor {
  bg: string;
  text: string;
  border: string;
  accent: string;
  solid: { bg: string; text: string };
}

export const STAGE_PALETTE: Record<PaletteKey, StageColor> = {
  gold: { bg: "bg-gold/15", text: "text-[#7a5f30]", border: "border-gold/30", accent: "#C8A55B", solid: { bg: "#C8A55B", text: "#0F1D35" } },
  coral: { bg: "bg-[#D97A6C]/15", text: "text-[#8a3f33]", border: "border-[#D97A6C]/30", accent: "#D97A6C", solid: { bg: "#C9685A", text: "#FFFFFF" } },
  steel: { bg: "bg-[#5B7C99]/15", text: "text-[#3d5872]", border: "border-[#5B7C99]/30", accent: "#5B7C99", solid: { bg: "#597A96", text: "#FFFFFF" } },
  plum: { bg: "bg-[#7B5C8E]/15", text: "text-[#553d64]", border: "border-[#7B5C8E]/30", accent: "#7B5C8E", solid: { bg: "#7B5C8E", text: "#FFFFFF" } },
  teal: { bg: "bg-teal/15", text: "text-[#1f5c50]", border: "border-teal/30", accent: "#2A7F6F", solid: { bg: "#2A7F6F", text: "#FFFFFF" } },
  sage: { bg: "bg-sage/20", text: "text-[#4d6355]", border: "border-sage/40", accent: "#8FA89A", solid: { bg: "#7A9486", text: "#0F1D35" } },
  amber: { bg: "bg-[#B77F2E]/15", text: "text-[#7a5220]", border: "border-[#B77F2E]/30", accent: "#B77F2E", solid: { bg: "#B77F2E", text: "#0F1D35" } },
  green: { bg: "bg-[#3E7A4E]/15", text: "text-[#2c5837]", border: "border-[#3E7A4E]/30", accent: "#3E7A4E", solid: { bg: "#3E7A4E", text: "#FFFFFF" } },
  stone: { bg: "bg-[#8C7B6B]/15", text: "text-[#5c4f43]", border: "border-[#8C7B6B]/30", accent: "#8C7B6B", solid: { bg: "#817162", text: "#FFFFFF" } },
  gray: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", accent: "#9A9A9A", solid: { bg: "#9A9A9A", text: "#0F1D35" } },
  navy: { bg: "bg-navy/10", text: "text-navy", border: "border-navy/30", accent: "#0F1D35", solid: { bg: "#0F1D35", text: "#FFFFFF" } },
};

export function paletteFor(key: string | null | undefined): StageColor {
  return (STAGE_PALETTE as Record<string, StageColor>)[key ?? ""] ?? STAGE_PALETTE.gray;
}

// Timeline dot colors per event kind — same palette so the timeline reads as
// part of the brand.
export const EVENT_KIND_PALETTE: Record<string, PaletteKey> = {
  lead_submission: "gold",
  note: "stone",
  call: "teal",
  text: "steel",
  email: "steel",
  stage_change: "navy",
  task_done: "green",
  deal: "amber",
  system: "gray",
};
