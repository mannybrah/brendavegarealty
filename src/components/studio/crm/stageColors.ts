import { Stage } from "@/lib/crm/normalize";

// Single source of truth for the CRM stage color system. `bg`/`text`/`border`
// are Tailwind class names (safe for pills, chips, tints); `accent` is the
// raw hex used wherever Tailwind's class system can't reach — inline styles
// for per-stage top borders, timeline dot fills, progress bars, etc. Text
// colors are hand-picked darker tones of each family, tuned for >=4.5:1
// contrast against white/cream/ivory backgrounds.
//
// `solid` is a second raw-hex pair for the rarer case of a *fully filled*
// chip/pill (background = the stage color itself, not a tint) — e.g. a
// selected filter chip or the active step of the stage stepper. Plain
// white-on-accent fails WCAG AA for the lighter families (gold, amber,
// stone, gray), so `solid.bg` is a lightly darkened accent where needed and
// `solid.text` is whichever of navy/white actually clears 4.5:1 against it.
export interface StageColor {
  bg: string;
  text: string;
  border: string;
  accent: string;
  solid: { bg: string; text: string };
}

export const STAGE_COLORS: Record<Stage, StageColor> = {
  new: {
    bg: "bg-gold/15",
    text: "text-[#7a5f30]",
    border: "border-gold/30",
    accent: "#C8A55B",
    solid: { bg: "#C8A55B", text: "#0F1D35" },
  },
  contacted: {
    bg: "bg-[#5B7C99]/15",
    text: "text-[#3d5872]",
    border: "border-[#5B7C99]/30",
    accent: "#5B7C99",
    solid: { bg: "#597A96", text: "#FFFFFF" },
  },
  active: {
    bg: "bg-teal/15",
    text: "text-[#1f5c50]",
    border: "border-teal/30",
    accent: "#2A7F6F",
    solid: { bg: "#2A7F6F", text: "#FFFFFF" },
  },
  under_contract: {
    bg: "bg-[#B77F2E]/15",
    text: "text-[#7a5220]",
    border: "border-[#B77F2E]/30",
    accent: "#B77F2E",
    solid: { bg: "#B77F2E", text: "#0F1D35" },
  },
  closed: {
    bg: "bg-[#3E7A4E]/15",
    text: "text-[#2c5837]",
    border: "border-[#3E7A4E]/30",
    accent: "#3E7A4E",
    solid: { bg: "#3E7A4E", text: "#FFFFFF" },
  },
  sphere: {
    bg: "bg-[#8C7B6B]/15",
    text: "text-[#5c4f43]",
    border: "border-[#8C7B6B]/30",
    accent: "#8C7B6B",
    solid: { bg: "#817162", text: "#FFFFFF" },
  },
  archived: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-200",
    accent: "#9A9A9A",
    solid: { bg: "#9A9A9A", text: "#0F1D35" },
  },
};
