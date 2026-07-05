import { buildPolishPrompt, parsePolishResponse } from "@/lib/blogPolish";

const valid = {
  title: "T", excerpt: "E", metaDescription: "M", keywords: ["a"],
  contentHtml: "<h2>x</h2><p>y</p>", videoScript: "V",
};

describe("parsePolishResponse", () => {
  it("parses plain JSON", () => {
    expect(parsePolishResponse(JSON.stringify(valid)).title).toBe("T");
  });
  it("strips markdown code fences", () => {
    expect(parsePolishResponse("```json\n" + JSON.stringify(valid) + "\n```").excerpt).toBe("E");
  });
  it("throws on missing fields", () => {
    expect(() => parsePolishResponse(JSON.stringify({ title: "T" }))).toThrow();
  });
  it("throws on non-JSON", () => {
    expect(() => parsePolishResponse("sorry, I can't")).toThrow();
  });
});

describe("buildPolishPrompt", () => {
  it("includes title, category, and notes", () => {
    const p = buildPolishPrompt({ title: "My Post", category: "Buying", rawNotes: "note text" });
    expect(p).toContain("My Post");
    expect(p).toContain("Buying");
    expect(p).toContain("note text");
  });
});
