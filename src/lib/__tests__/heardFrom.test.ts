import { HEARD_FROM, normalizeHeardFrom, heardFromLabel, withHeardVia } from "@/lib/heardFrom";

describe("normalizeHeardFrom", () => {
  it("keeps every known option", () => {
    for (const h of HEARD_FROM) expect(normalizeHeardFrom(h.value)).toBe(h.value);
  });
  it("trims whitespace", () => {
    expect(normalizeHeardFrom("  ai-claude ")).toBe("ai-claude");
  });
  it("drops unknown, empty and non-string values instead of rejecting", () => {
    expect(normalizeHeardFrom("ai-skynet")).toBe("");
    expect(normalizeHeardFrom("")).toBe("");
    expect(normalizeHeardFrom(undefined)).toBe("");
    expect(normalizeHeardFrom(null)).toBe("");
    expect(normalizeHeardFrom(42)).toBe("");
    expect(normalizeHeardFrom({ value: "ai-claude" })).toBe("");
  });
});

describe("heardFromLabel", () => {
  it("prefixes AI assistants with their group", () => {
    expect(heardFromLabel("ai-claude")).toBe("AI assistant: Claude");
    expect(heardFromLabel("ai-other")).toBe("AI assistant: Another AI assistant");
  });
  it("returns the plain label for ungrouped options", () => {
    expect(heardFromLabel("google")).toBe("Google search");
    expect(heardFromLabel("google-maps")).toBe("Google Maps");
  });
  it("returns null when unanswered or unknown", () => {
    expect(heardFromLabel("")).toBeNull();
    expect(heardFromLabel("<script>")).toBeNull();
    expect(heardFromLabel(undefined)).toBeNull();
  });
});

describe("withHeardVia", () => {
  it("appends a Heard via line on its own paragraph by default", () => {
    expect(withHeardVia("Looking to sell in Campbell", "ai-chatgpt")).toBe(
      "Looking to sell in Campbell\n\nHeard via: AI assistant: ChatGPT"
    );
  });
  it("supports the pipe-separated lead summary format", () => {
    expect(withHeardVia("Lead from scheduler | Timeline: 0-3 months", "referral", " | ")).toBe(
      "Lead from scheduler | Timeline: 0-3 months | Heard via: Friend, family or referral"
    );
  });
  it("leaves the message untouched when unanswered or unknown", () => {
    expect(withHeardVia("Hello", "")).toBe("Hello");
    expect(withHeardVia("Hello", "not-an-option")).toBe("Hello");
    expect(withHeardVia("Hello", undefined)).toBe("Hello");
  });
});
