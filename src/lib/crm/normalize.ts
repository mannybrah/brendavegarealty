export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

export function normalizeEmail(raw: string | null | undefined): string | null {
  const v = raw?.trim().toLowerCase();
  return v ? v : null;
}

export function splitName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return { firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") };
}
