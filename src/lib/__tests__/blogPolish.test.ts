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

describe("sanitizeContentHtml", () => {
  const { sanitizeContentHtml } = require("@/lib/blogPolish");
  it("strips script and style blocks", () => {
    expect(sanitizeContentHtml('<p>a</p><script>alert(1)</script><style>x{}</style><p>b</p>')).toBe("<p>a</p><p>b</p>");
  });
  it("strips inline event handlers", () => {
    expect(sanitizeContentHtml('<img src="/media/blog/a.jpg" onerror="alert(1)" />')).toBe('<img src="/media/blog/a.jpg" />');
  });
  it("neutralizes javascript: URLs", () => {
    expect(sanitizeContentHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a href="#">x</a>');
  });
  it("leaves normal content untouched", () => {
    const html = '<h2>Title</h2><p>Text with <strong>bold</strong> and <a href="/contact">link</a>.</p>';
    expect(sanitizeContentHtml(html)).toBe(html);
  });
});
