// List → profile navigation state, so the profile can step prev/next through
// the exact list the user was looking at and "back" restores filters + scroll.

export interface ListNav {
  ids: string[];
  index: number;
  label: string;
  returnTo: string;
  scrollY: number;
}

const KEY = "crm.nav";

export function saveListNav(state: ListNav): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota */
  }
}

export function readListNav(): ListNav | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as ListNav;
    return Array.isArray(v.ids) && typeof v.returnTo === "string" ? v : null;
  } catch {
    return null;
  }
}

export function updateListNavIndex(index: number): void {
  const cur = readListNav();
  if (cur) saveListNav({ ...cur, index });
}

export function clearListNav(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
