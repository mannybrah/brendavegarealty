import { normalizeEmail, normalizePhone } from "./normalize";
import { EMAIL_LABELS, PHONE_LABELS } from "./types";

export interface PhoneInput {
  number: string;
  label?: string;
  isPrimary?: boolean;
  isBad?: boolean;
}
export interface EmailInput {
  address: string;
  label?: string;
  isPrimary?: boolean;
  isBad?: boolean;
}
export interface NormalizedPhone {
  number: string;
  label: string;
  isPrimary: boolean;
  isBad: boolean;
}
export interface NormalizedEmail {
  address: string;
  label: string;
  isPrimary: boolean;
  isBad: boolean;
}

function pickPrimary<T extends { isPrimary: boolean }>(items: T[]): T[] {
  const idx = items.findIndex((i) => i.isPrimary);
  const primaryIdx = idx === -1 ? 0 : idx;
  return items.map((i, n) => ({ ...i, isPrimary: n === primaryIdx }));
}

export function normalizePhoneInputs(inputs: PhoneInput[] | undefined | null): NormalizedPhone[] {
  const seen = new Set<string>();
  const out: NormalizedPhone[] = [];
  for (const raw of inputs ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const number = normalizePhone(typeof raw.number === "string" ? raw.number : "");
    if (!number || seen.has(number)) continue;
    seen.add(number);
    const label = (PHONE_LABELS as readonly string[]).includes(raw.label ?? "") ? (raw.label as string) : "mobile";
    out.push({ number, label, isPrimary: !!raw.isPrimary, isBad: !!raw.isBad });
  }
  return pickPrimary(out);
}

export function normalizeEmailInputs(inputs: EmailInput[] | undefined | null): NormalizedEmail[] {
  const seen = new Set<string>();
  const out: NormalizedEmail[] = [];
  for (const raw of inputs ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const address = normalizeEmail(typeof raw.address === "string" ? raw.address : "");
    if (!address || seen.has(address)) continue;
    seen.add(address);
    const label = (EMAIL_LABELS as readonly string[]).includes(raw.label ?? "") ? (raw.label as string) : "personal";
    out.push({ address, label, isPrimary: !!raw.isPrimary, isBad: !!raw.isBad });
  }
  return pickPrimary(out);
}

export interface AddressInput {
  address: string;
  label?: string;
  isPrimary?: boolean;
}
export interface NormalizedAddress {
  address: string;
  label: string;
  isPrimary: boolean;
}

export function normalizeAddressInputs(inputs: AddressInput[] | undefined | null): NormalizedAddress[] {
  const seen = new Set<string>();
  const out: NormalizedAddress[] = [];
  for (const raw of inputs ?? []) {
    if (!raw || typeof raw !== "object") continue;
    const address = typeof raw.address === "string" ? raw.address.trim().replace(/\s+/g, " ").slice(0, 200) : "";
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const label = (typeof raw.label === "string" ? raw.label.trim().slice(0, 40) : "") || "Home";
    out.push({ address, label, isPrimary: !!raw.isPrimary });
  }
  return pickPrimary(out);
}
