export type MilestoneTemplate = { title: string; kind: string; clientVisible: boolean };

const BUYER: MilestoneTemplate[] = [
  { title: "Offer accepted", kind: "paperwork", clientVisible: true },
  { title: "Earnest money deposited", kind: "paperwork", clientVisible: true },
  { title: "Home inspection", kind: "inspection", clientVisible: true },
  { title: "Termite / other inspections", kind: "inspection", clientVisible: true },
  { title: "Appraisal", kind: "appraisal", clientVisible: true },
  { title: "Loan approval", kind: "paperwork", clientVisible: true },
  { title: "Contingency removal", kind: "contingency", clientVisible: false },
  { title: "Final walkthrough", kind: "walkthrough", clientVisible: true },
  { title: "Signing", kind: "signing", clientVisible: true },
  { title: "Close of escrow 🎉", kind: "close", clientVisible: true },
];

const SELLER: MilestoneTemplate[] = [
  { title: "Listing agreement signed", kind: "paperwork", clientVisible: true },
  { title: "Prep, staging & photos", kind: "custom", clientVisible: true },
  { title: "Live on MLS", kind: "custom", clientVisible: true },
  { title: "Open house", kind: "open_house", clientVisible: true },
  { title: "Offer review", kind: "paperwork", clientVisible: false },
  { title: "Buyer contingencies", kind: "contingency", clientVisible: true },
  { title: "Buyer walkthrough", kind: "walkthrough", clientVisible: true },
  { title: "Signing", kind: "signing", clientVisible: true },
  { title: "Close of escrow 🎉", kind: "close", clientVisible: true },
];

export function dealTemplate(side: "buyer" | "seller"): MilestoneTemplate[] {
  return (side === "buyer" ? BUYER : SELLER).map((m) => ({ ...m }));
}
