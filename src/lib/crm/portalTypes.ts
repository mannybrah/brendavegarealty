export interface DealRow {
  id: string;
  contact_id: string;
  side: string;
  property_address: string;
  status: string;
  target_close_date: string | null;
  portal_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface MilestoneRow {
  id: string;
  deal_id: string;
  title: string;
  kind: string;
  date: string | null;
  status: string;
  client_visible: number;
  notes: string;
  sort_order: number;
  reminded_day_before: string | null;
  reminded_day_of: string | null;
  created_at: string;
  updated_at: string;
}

export interface PortalData {
  deal: DealRow;
  contactFirstName: string;
  milestones: MilestoneRow[];
}
