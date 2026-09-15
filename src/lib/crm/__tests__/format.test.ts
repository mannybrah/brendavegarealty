import {
  formatPhone,
  formatPrice,
  lastCommunicationLabel,
  lastCommShort,
  initials,
  avatarColor,
  daysSince,
  formatDue,
} from "../format";

const now = new Date("2026-09-14T20:00:00Z");

describe("format", () => {
  it("formats phones", () => {
    expect(formatPhone("4085551234")).toBe("(408) 555-1234");
    expect(formatPhone("12345")).toBe("12345");
  });
  it("formats price", () => {
    expect(formatPrice(520000)).toBe("$520,000");
    expect(formatPrice(null)).toBe("");
  });
  it("labels last communication", () => {
    expect(lastCommunicationLabel(null, now)).toBe("No communication yet");
    expect(lastCommunicationLabel("2026-09-14T10:00:00Z", now)).toBe("Last communication today");
    expect(lastCommunicationLabel("2026-09-13T10:00:00Z", now)).toBe("Last communication 1 day ago");
    expect(lastCommunicationLabel("2026-09-07T10:00:00Z", now)).toBe("Last communication 7 days ago");
  });
  it("short last-comm labels", () => {
    expect(lastCommShort(null, now)).toBe("never");
    expect(lastCommShort("2026-09-14T10:00:00Z", now)).toBe("today");
    expect(lastCommShort("2026-09-01T10:00:00Z", now)).toBe("13d");
    expect(lastCommShort("2026-06-01T10:00:00Z", now)).toBe("3mo");
    expect(lastCommShort("2024-06-01T10:00:00Z", now)).toBe("2y");
  });
  it("daysSince floors whole days", () => {
    expect(daysSince("2026-09-12T21:00:00Z", now)).toBe(1);
  });
  it("initials and stable avatar color", () => {
    expect(initials("Bill", "Dawn")).toBe("BD");
    expect(initials("", "")).toBe("?");
    expect(avatarColor("Bill Dawn")).toBe(avatarColor("Bill Dawn"));
    expect(avatarColor("Bill Dawn")).not.toBe("gray");
  });
  it("formats due dates with optional time", () => {
    expect(formatDue(null)).toBe("");
    expect(formatDue("2026-09-14")).toBe("Sep 14");
    expect(formatDue("2026-09-14T15:30")).toBe("Sep 14 · 3:30 pm");
    expect(formatDue("2026-09-14T00:05")).toBe("Sep 14 · 12:05 am");
  });
});
