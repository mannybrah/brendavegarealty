export const CHECKLIST_PHASES: Record<number, string> = {
  1: "Listing kickoff",
  2: "Week before market",
  3: "Contract to close",
  4: "Marketing menu",
};

const PHASE_1: string[] = [
  "Send signed listing agreement to all parties",
  "Create file and escrow record with all party info",
  "Introduction email to sellers and escrow officer",
  "Order reports: Prelim, JCP, CLUE & HOA documents",
  "Send listing schedules and timeline to all parties",
  "Schedule all inspections (property, roof, foundation, pool, chimney)",
  "Put preliminary property info on MLS as Coming Soon",
  "Prepare disclosures for clients to sign",
  "Get all disclosure reports ready via Disclosure I.O.",
  "Create punch list and repair suggestions for clients",
  "Assist with contractor quotes for all repairs",
  "Supervise contractors to complete repairs",
  "Schedule clean up and haul-away of trash",
  "Create repair and construction schedule",
  "Give tentative construction & staging schedule to stager",
  "Schedule photographer",
  "Order and install For Sale sign on property",
  "Order property sign rider",
  "Input house information into MLS",
];

const PHASE_2: string[] = [
  "Schedule staging items; staging instructions ready",
  "Schedule cleaner for the house",
  "Schedule regular gardening service for yard",
  "Power wash the house",
  "Get open house box and signs ready",
  "Get basic cleaning tools to the house",
  "Order food and beverages for open house",
  "Create flyers with detailed property description",
  "Post open house info on social media",
  "Send group email to client database",
  "Send new listing info to local realtors (flyers/PropertyBlast)",
  "Get all signed disclosures ready; binder in the house",
  "Upload disclosures (Inspection, HOA, Title, Seller, NHD)",
  "Host open house; collect leads",
  "Schedule food delivery during open house hours",
  "Assist with door knocking and goodie bags",
  "Enter all open-house leads in the CRM",
  "Send thank-you email same day",
  "Follow-up call to all leads; send disclosure package link",
];

const PHASE_3: string[] = [
  "Create escrow calendar and send to all parties",
  "Send congratulations email to clients",
  "Send executed contract to agents, title officer, lender",
  "Get signed disclosures from buyer's agent (within 5 days)",
  "Get copy of buyer's EMD receipt",
  "Order HOA certificate from HOA on lender's behalf",
  "Confirm all parties signed and received disclosures & reports",
  "Verify: Prelim, Termite, Geological, Environmental, Earthquake, Roof, Pool, Inspection",
  "Earthquake book signed; buyer acknowledged receipt in writing",
  "Remove contingencies — finance, property, HOA, disclosures",
  "Confirm possession / rent-back timeframes",
  "Order home warranty",
  "Order HOA final inspection if needed",
  "Order homeowner insurance if needed",
  "Order loan payoff statement from seller's bank",
  "Confirm loan doc delivery to title company with buyer's agent",
  "Interview & select moving companies; confirm move date",
  "Confirm all parties in town for sign-off",
  "Send utility service info to client (PG&E shut-off; buyer to re-order)",
  "Schedule sign-off with escrow officer and seller",
  "Review seller's final closing statement with escrow officer",
  "Email soft copy of closing statement to seller before sign-off",
  "Review transaction file — confirm all signatures complete",
  "Submit commission demand to broker",
  "Schedule final walkthrough with buyers",
  "Get all keys ready and labeled for new owner",
  "Collect garage openers, manuals, warranties, home docs",
  "Go to sign-off",
  "Get copy of final walkthrough from buyer",
  "Send demand to escrow officer",
  "Coordinate final clean-up with stager",
  "Coordinate key exchange at COE",
  "Schedule removal of staging items and For Sale signs",
  "Remove open house box, cleaning products, signs from house",
  "Prepare signed disclosure link to send to client",
  "Deliver closing gift",
  "Send client testimonial link",
];

const PHASE_4: string[] = [
  "Professional photos ($)",
  "Professional videos ($)",
  "Floor plan and Matterport tour ($)",
  "Post ads on social media ($)",
  "Half-page farm flyer ($)",
  "Full 4-page regular flyer ($)",
  "Property rider on sign ($)",
  "MLS input",
  "Promotional email to sphere",
  "1 Coming Soon story or reel — 30 days prior",
  "1 Action video — prep showcase",
  "1 Before & After video",
  "1 Just Listed post",
  "1 Just Pending post",
  "1 Closing post with clients",
  "Marketing & CMA board at open house",
  "20 open house signs",
  "Circle prospecting — invite clients",
  "Amenity cards",
  "1-page farm flyer",
];

const PHASES: Array<[number, string[]]> = [
  [1, PHASE_1],
  [2, PHASE_2],
  [3, PHASE_3],
  [4, PHASE_4],
];

export function listingChecklist(): Array<{ phase: number; title: string }> {
  const items: Array<{ phase: number; title: string }> = [];
  for (const [phase, titles] of PHASES) {
    for (const title of titles) {
      items.push({ phase, title });
    }
  }
  return items;
}
