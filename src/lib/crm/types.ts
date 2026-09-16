// Shared CRM row types. Pure (no worker imports) so both the Next.js client
// and the worker can use them, and jest can import anything that depends on
// them.

export interface StageRow {
  id: string;
  name: string;
  description: string;
  color: string;
  sort_order: number;
  is_system: number;
  created_at: string;
}

export interface ContactRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  type: string | null;
  stage: string;
  source: string | null;
  notes: string;
  price: number | null;
  timeframe: string | null;
  last_communication_at: string | null;
  created_at: string;
  updated_at: string;
  last_activity_at: string;
}

export interface TagRow {
  id: string;
  name: string;
}

export interface TagWithCount extends TagRow {
  count: number;
}

export interface ContactListRow extends ContactRow {
  tags: TagRow[];
}

export interface PhoneRow {
  id: string;
  contact_id: string;
  relationship_id: string | null;
  number: string;
  label: string;
  is_primary: number;
  is_bad: number;
  sort_order: number;
  created_at: string;
}

export interface EmailRow {
  id: string;
  contact_id: string;
  relationship_id: string | null;
  address: string;
  label: string;
  is_primary: number;
  is_bad: number;
  sort_order: number;
  created_at: string;
}

export interface AddressRow {
  id: string;
  contact_id: string;
  relationship_id: string | null;
  label: string;
  address: string;
  is_primary: number;
  sort_order: number;
  created_at: string;
}

export interface RelationshipRow {
  id: string;
  contact_id: string;
  first_name: string;
  last_name: string;
  type: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RelationshipFull extends RelationshipRow {
  phones: PhoneRow[];
  emails: EmailRow[];
  addresses: AddressRow[];
}

export interface EventRow {
  id: string;
  contact_id: string;
  kind: string;
  body: string;
  meta: string | null;
  outcome: string | null;
  starred: number;
  updated_at: string | null;
  created_at: string;
}

export interface TaskRow {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  milestone_id: string | null;
  title: string;
  type: string;
  due_at: string | null;
  done_at: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface TaskListRow extends TaskRow {
  contact_name: string | null;
  deal_address: string | null;
}

export interface DealWithProgress {
  id: string;
  contact_id: string;
  side: string;
  property_address: string;
  status: string;
  target_close_date: string | null;
  portal_token: string | null;
  created_at: string;
  updated_at: string;
  milestonesTotal: number;
  milestonesDone: number;
}

export interface ContactBundle {
  contact: ContactRow;
  phones: PhoneRow[];
  emails: EmailRow[];
  addresses: AddressRow[];
  relationships: RelationshipFull[];
  tags: TagRow[];
  events: EventRow[];
  tasks: TaskRow[];
  deals: DealWithProgress[];
}

export const TIMEFRAMES = ["now", "0_3", "3_6", "6_12", "12_plus"] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
export const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  now: "Now",
  "0_3": "0–3 months",
  "3_6": "3–6 months",
  "6_12": "6–12 months",
  "12_plus": "12+ months",
};

export const CONTACT_TYPES = ["buyer", "seller", "both", "other"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];
export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  buyer: "Buyer",
  seller: "Seller",
  both: "Buyer & Seller",
  other: "Other",
};

export const TASK_TYPES = ["call", "text", "email", "follow_up", "showing", "appointment", "other"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
  follow_up: "Follow up",
  showing: "Showing",
  appointment: "Appointment",
  other: "Other",
};
export const TASK_TYPE_ICONS: Record<TaskType, string> = {
  call: "📞",
  text: "💬",
  email: "✉️",
  follow_up: "🔁",
  showing: "🏠",
  appointment: "📅",
  other: "•",
};

export const CALL_OUTCOMES = ["spoke", "voicemail", "no_answer", "bad_number"] as const;
export type CallOutcome = (typeof CALL_OUTCOMES)[number];
export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  spoke: "Spoke",
  voicemail: "Left voicemail",
  no_answer: "No answer",
  bad_number: "Bad number",
};

export const EDITABLE_EVENT_KINDS = ["note", "call", "text", "email"] as const;
export const COMMUNICATION_KINDS = ["call", "text", "email"] as const;
export const ACTIVITY_EVENT_KINDS = ["lead_submission", "stage_change", "task_done", "deal"] as const;

export const EVENT_ICON: Record<string, string> = {
  lead_submission: "📥",
  note: "📝",
  call: "📞",
  text: "💬",
  email: "✉️",
  stage_change: "🔁",
  task_done: "✅",
  deal: "🏠",
  system: "⚙️",
};

export const ADDRESS_LABEL_SUGGESTIONS = ["Home", "Mailing", "Investment", "Second home", "Rental", "Work", "Other"] as const;

export const PHONE_LABELS = ["mobile", "home", "work", "other"] as const;
export const EMAIL_LABELS = ["personal", "work", "other"] as const;
export const RELATIONSHIP_TYPES = [
  "Spouse",
  "Partner",
  "Co-buyer",
  "Parent",
  "Child",
  "Sibling",
  "Friend",
  "Lender",
  "Attorney",
  "Other",
] as const;
