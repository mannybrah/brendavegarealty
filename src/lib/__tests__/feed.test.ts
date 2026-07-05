import { validateFeedInput, relativeTime } from "@/lib/feed";

describe("validateFeedInput", () => {
  it("accepts a valid post", () => {
    const r = validateFeedInput({ type: "just-listed", caption: "New in Campbell!", imageKeys: ["feed/a.jpg"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.type).toBe("just-listed");
  });
  it("rejects unknown type", () => {
    expect(validateFeedInput({ type: "party", caption: "x", imageKeys: [] }).ok).toBe(false);
  });
  it("rejects empty caption when no images", () => {
    expect(validateFeedInput({ type: "update", caption: "  ", imageKeys: [] }).ok).toBe(false);
  });
  it("allows empty caption when there is an image", () => {
    expect(validateFeedInput({ type: "update", caption: "", imageKeys: ["feed/a.jpg"] }).ok).toBe(true);
  });
  it("caps images at 4 and caption at 1000 chars", () => {
    expect(validateFeedInput({ type: "update", caption: "x", imageKeys: ["a","b","c","d","e"] }).ok).toBe(false);
    expect(validateFeedInput({ type: "update", caption: "x".repeat(1001), imageKeys: [] }).ok).toBe(false);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-07-05T20:00:00Z");
  it("minutes/hours/days", () => {
    expect(relativeTime("2026-07-05T19:58:00Z", now)).toBe("2m ago");
    expect(relativeTime("2026-07-05T17:00:00Z", now)).toBe("3h ago");
    expect(relativeTime("2026-07-03T20:00:00Z", now)).toBe("2d ago");
  });
  it("falls back to short date after 7 days", () => {
    expect(relativeTime("2026-06-01T00:00:00Z", now)).toBe("Jun 1");
  });
});
