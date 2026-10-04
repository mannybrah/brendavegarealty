// "How did you hear about us?" — optional on every public lead form. AI apps often
// send no referrer, so asking is the only reliable way to see which assistant
// recommended Brenda. Shared by the forms (options) and the worker (validation +
// the "Heard via: ..." line appended to the CRM lead event). Plain TS only: this
// file is compiled by both the Next build and tsconfig.worker.json.
export const HEARD_FROM = [
  { value: "google", label: "Google search" },
  { value: "google-maps", label: "Google Maps" },
  { value: "ai-chatgpt", label: "ChatGPT", group: "AI assistant" },
  { value: "ai-claude", label: "Claude", group: "AI assistant" },
  { value: "ai-gemini", label: "Gemini", group: "AI assistant" },
  { value: "ai-perplexity", label: "Perplexity", group: "AI assistant" },
  { value: "ai-other", label: "Another AI assistant", group: "AI assistant" },
  { value: "referral", label: "Friend, family or referral" },
  { value: "social", label: "Social media" },
  { value: "other", label: "Other" },
] as const;

/** A known option value, or "" — unknown answers are dropped, never rejected. */
export function normalizeHeardFrom(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return HEARD_FROM.some((h) => h.value === v) ? v : "";
}

/** "AI assistant: Claude" / "Google search" for the CRM; null when unanswered or unknown. */
export function heardFromLabel(value: unknown): string | null {
  const v = normalizeHeardFrom(value);
  const h = HEARD_FROM.find((x) => x.value === v);
  if (!h) return null;
  return "group" in h ? `${h.group}: ${h.label}` : h.label;
}

/** Appends "Heard via: ..." to a lead message; returns the message untouched when unanswered. */
export function withHeardVia(message: string, heardFrom: unknown, separator = "\n\n"): string {
  const label = heardFromLabel(heardFrom);
  return label ? `${message}${separator}Heard via: ${label}` : message;
}
