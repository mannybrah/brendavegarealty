// Brenda Vega's Home Clarity: shared, dependency-free rules for the disclosure
// upload form. Imported by the public form, the studio inbox, the worker and jest.

export const HC_CONSENT_VERSION = "2026-11-13";
export const HC_CONSENT_NOTICE =
  "By submitting, you’re requesting your complimentary disclosure analysis and personal follow-up from Brenda. You are not signing up for a newsletter.";

export const HC_DEFAULT_MAX_MB = 25;

export type AgentStatus = "represented" | "looking" | "exploring";
export type PreferredContact = "email" | "phone";
export type IntakeState = "awaiting_upload" | "received" | "expired";
export type ReportStatus = "not_started" | "in_progress" | "ready" | "sent";
export type ContactStatus =
  | "new"
  | "outreach_pending"
  | "contacted"
  | "walkthrough_scheduled"
  | "completed"
  | "closed";

export const AGENT_STATUS_QUESTION = "Are you currently working with a real estate agent?";
export const AGENT_STATUS_OPTIONS: { value: AgentStatus; label: string }[] = [
  { value: "represented", label: "Yes, I’m already working with an agent" },
  { value: "looking", label: "No, I’m looking for an agent" },
  { value: "exploring", label: "I’m just exploring my options" },
];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  not_started: "Not started",
  in_progress: "Analysis in progress",
  ready: "Report ready",
  sent: "Report sent to buyer",
};

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  new: "New",
  outreach_pending: "Outreach pending",
  contacted: "Contacted",
  walkthrough_scheduled: "Walkthrough scheduled",
  completed: "Completed",
  closed: "Closed",
};

export const REPORT_STATUSES = Object.keys(REPORT_STATUS_LABELS) as ReportStatus[];
export const CONTACT_STATUSES = Object.keys(CONTACT_STATUS_LABELS) as ContactStatus[];

export function agentStatusLabel(value: string | null | undefined): string {
  const found = AGENT_STATUS_OPTIONS.find((o) => o.value === value);
  return found ? found.label : "Not answered";
}

export interface IntakeInput {
  propertyAddress: string;
  fullName: string;
  email: string;
  phone: string | null;
  preferredContact: PreferredContact;
  agentStatus: AgentStatus | null;
  questions: string | null;
  fileName: string;
  fileBytes: number;
  idempotencyKey: string;
  sourcePage: string | null;
  utm: Record<string, string> | null;
}

export type IntakeErrors = Partial<Record<
  "propertyAddress" | "fullName" | "email" | "phone" | "preferredContact" | "file" | "consent" | "form",
  string
>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function text(value: unknown): string {
  if (typeof value !== "string") return "";
  let out = "";
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    // Keep newlines and tabs, drop other control characters
    out += code === 10 || code === 9 || (code >= 32 && code !== 127) ? value[i] : " ";
  }
  return out.trim();
}

function oneLine(value: unknown): string {
  return text(value).replace(/\s+/g, " ");
}

export function phoneDigits(value: unknown): string {
  return typeof value === "string" ? value.replace(/\D/g, "") : "";
}

/** A display-safe file name: no path parts, bounded length, always ends in .pdf. */
export function cleanFileName(value: unknown): string {
  const base = oneLine(value)
    .split(/[\\/]/)
    .pop()!
    .replace(/[<>:"|?*]/g, "")
    .replace(/^\.+/, "")
    .trim();
  if (!base) return "disclosure.pdf";
  const capped = base.length > 120 ? base.slice(0, 120) : base;
  return /\.pdf$/i.test(capped) ? capped : `${capped}.pdf`;
}

export function maxBytes(maxMb: number = HC_DEFAULT_MAX_MB): number {
  return Math.round(maxMb * 1024 * 1024);
}

/**
 * Validate a submission. Used in the browser for inline messages and again on the
 * server, which never trusts the browser's answer.
 */
export function validateIntake(
  body: Record<string, unknown>,
  maxMb: number = HC_DEFAULT_MAX_MB
): { ok: true; value: IntakeInput } | { ok: false; errors: IntakeErrors } {
  const errors: IntakeErrors = {};

  // Preserve the buyer's own wording of the address; only tidy whitespace
  const propertyAddress = oneLine(body.propertyAddress);
  if (propertyAddress.length < 5) errors.propertyAddress = "Enter the property address.";
  else if (propertyAddress.length > 300) errors.propertyAddress = "That address is too long.";

  const fullName = oneLine(body.fullName);
  if (fullName.length < 2) errors.fullName = "Enter your full name.";
  else if (fullName.length > 120) errors.fullName = "That name is too long.";

  const email = oneLine(body.email).toLowerCase();
  if (!email) errors.email = "Enter your email address.";
  else if (email.length > 200 || !EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  const preferredContact: PreferredContact = body.preferredContact === "phone" ? "phone" : "email";
  if (body.preferredContact !== "phone" && body.preferredContact !== "email") {
    errors.preferredContact = "Choose how you’d like Brenda to reach you.";
  }

  const phoneRaw = oneLine(body.phone);
  const digits = phoneDigits(phoneRaw);
  let phone: string | null = null;
  if (phoneRaw) {
    if (digits.length < 10 || digits.length > 15) errors.phone = "Enter a valid phone number.";
    else phone = phoneRaw.slice(0, 40);
  } else if (preferredContact === "phone") {
    errors.phone = "Add a phone number so Brenda can call you.";
  }

  const agentStatus =
    body.agentStatus === "represented" || body.agentStatus === "looking" || body.agentStatus === "exploring"
      ? body.agentStatus
      : null;

  const questionsRaw = text(body.questions);
  const questions = questionsRaw ? questionsRaw.slice(0, 2000) : null;

  const fileBytes = typeof body.fileBytes === "number" && Number.isInteger(body.fileBytes) ? body.fileBytes : 0;
  const rawName = typeof body.fileName === "string" ? body.fileName : "";
  if (fileBytes <= 0) errors.file = rawName ? "That file is empty. Choose another PDF." : "Choose your disclosure PDF.";
  else if (fileBytes > maxBytes(maxMb)) errors.file = `That file is larger than ${maxMb} MB.`;
  else if (rawName && !/\.pdf$/i.test(rawName.trim())) errors.file = "Upload a PDF file.";

  if (body.consent !== true) errors.consent = "Please confirm the request to continue.";

  const idempotencyKey = typeof body.idempotencyKey === "string" ? body.idempotencyKey : "";
  if (!/^[A-Za-z0-9_-]{16,80}$/.test(idempotencyKey)) errors.form = "Something went wrong. Refresh the page and try again.";

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  let utm: Record<string, string> | null = null;
  if (body.utm && typeof body.utm === "object") {
    const picked: Record<string, string> = {};
    for (const key of UTM_KEYS) {
      const v = (body.utm as Record<string, unknown>)[key];
      if (typeof v === "string" && v.trim()) picked[key] = oneLine(v).slice(0, 120);
    }
    if (Object.keys(picked).length > 0) utm = picked;
  }
  const sourcePage = oneLine(body.sourcePage).slice(0, 200) || null;

  return {
    ok: true,
    value: {
      propertyAddress,
      fullName,
      email,
      phone,
      preferredContact,
      agentStatus,
      questions,
      fileName: cleanFileName(rawName),
      fileBytes,
      idempotencyKey,
      sourcePage,
      utm,
    },
  };
}

/** "%PDF-" within the first kilobyte (some generators emit a short preamble). */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length - 4, 1024);
  for (let i = 0; i < limit; i++) {
    if (bytes[i] === 0x25 && bytes[i + 1] === 0x50 && bytes[i + 2] === 0x44 && bytes[i + 3] === 0x46 && bytes[i + 4] === 0x2d) {
      return true;
    }
  }
  return false;
}

/** Only http(s) links may be saved as a report link. */
export function cleanReportUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString().slice(0, 500);
  } catch {
    return null;
  }
}

export type InboxFilter = "all" | "new" | "in_progress" | "ready" | "contacted" | "done";

export const INBOX_FILTERS: { value: InboxFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "in_progress", label: "Analyzing" },
  { value: "ready", label: "Ready for follow-up" },
  { value: "contacted", label: "Contacted" },
  { value: "done", label: "Done" },
];

/** Which inbox bucket a request belongs to. Follow-up progress wins over report progress. */
export function inboxBucket(row: { report_status: string; contact_status: string }): Exclude<InboxFilter, "all"> {
  if (row.contact_status === "completed" || row.contact_status === "closed") return "done";
  if (row.contact_status === "contacted" || row.contact_status === "walkthrough_scheduled") return "contacted";
  if (row.report_status === "ready" || row.report_status === "sent") return "ready";
  if (row.report_status === "in_progress") return "in_progress";
  return "new";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
