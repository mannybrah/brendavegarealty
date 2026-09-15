import type { ContactFilters } from "./filters";

export interface SmartList {
  id: string;
  name: string;
  description: string;
  filter: Partial<Pick<ContactFilters, "stages" | "tagsAny" | "tagsNone" | "lastComm" | "created">>;
}

// Fixed in Phase 1; adapted from Follow Up Boss's default smart lists to the
// seeded stage set. Phase 2 adds user-saved lists on top of the same shape.
export const SMART_LISTS: SmartList[] = [
  {
    id: "needs_contact",
    name: "Needs Contact",
    description: "Brand-new leads to reach today. Aim for consistent outreach over 10 days.",
    filter: { stages: ["new", "attempted_contact"], created: { op: "within", days: 11 }, lastComm: { op: "over", days: 1 } },
  },
  {
    id: "potential_prospects",
    name: "Potential Prospects",
    description: "Under 30 days old and still early. Call every 5 days to convert.",
    filter: {
      stages: ["new", "attempted_contact", "contacted"],
      created: { op: "within", days: 31 },
      lastComm: { op: "over", days: 5 },
    },
  },
  {
    id: "current_clients",
    name: "Current Clients",
    description: "Active buyers and sellers. Touch base at least weekly.",
    filter: { stages: ["appointment_set", "active", "under_contract"], lastComm: { op: "over", days: 5 } },
  },
  {
    id: "nurture",
    name: "Nurture",
    description: "Not ready yet. Weekly check-ins keep you top of mind.",
    filter: { stages: ["nurture"], lastComm: { op: "over", days: 7 } },
  },
  {
    id: "past_clients",
    name: "Past Clients & Sphere",
    description: "Closed and sphere contacts you haven't spoken to in 90 days. Referrals live here.",
    filter: { stages: ["closed", "sphere"], lastComm: { op: "over", days: 90 } },
  },
];

export function smartListById(id: string): SmartList | undefined {
  return SMART_LISTS.find((l) => l.id === id);
}
