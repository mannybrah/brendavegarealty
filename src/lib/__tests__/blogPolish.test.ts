import {
  buildArticlePrompt,
  buildMetaPrompt,
  parseArticleHtml,
  parseMetaResponse,
  sanitizeContentHtml,
} from "@/lib/blogPolish";

const longArticle =
  "<h2>Section</h2>" +
  Array(45)
    .fill("<p>" + Array(10).fill("word word word word word word word word word word").join(" ") + "</p>")
    .join("");

describe("parseArticleHtml", () => {
  it("accepts a full-length article", () => {
    expect(parseArticleHtml(longArticle)).toContain("<h2>Section</h2>");
  });
  it("strips markdown fences and leading prose", () => {
    expect(parseArticleHtml("```html\n" + longArticle + "\n```")).toContain("<h2>");
    expect(parseArticleHtml("Here is the article:\n" + longArticle)).toMatch(/^<h2>/);
  });
  it("throws when the article is too short", () => {
    expect(() => parseArticleHtml("<h2>t</h2><p>too short</p>")).toThrow(/too short/);
  });
  it("throws when structure is missing", () => {
    expect(() => parseArticleHtml("<p>" + "word ".repeat(500) + "</p>")).toThrow(/structure/);
  });
  it("throws on non-HTML", () => {
    expect(() => parseArticleHtml("sorry, I can't")).toThrow();
  });
  it("sanitizes the article", () => {
    expect(parseArticleHtml(longArticle + "<script>alert(1)</script>")).not.toContain("<script>");
  });
});

describe("parseMetaResponse", () => {
  const valid = { title: "T", excerpt: "E", metaDescription: "M", keywords: ["a"], videoScript: "V" };
  it("parses valid metadata JSON", () => {
    const m = parseMetaResponse(JSON.stringify(valid));
    expect(m.title).toBe("T");
    expect(m.keywords).toEqual(["a"]);
  });
  it("clamps metaDescription to 160 chars", () => {
    const m = parseMetaResponse(JSON.stringify({ ...valid, metaDescription: "x".repeat(300) }));
    expect(m.metaDescription.length).toBe(160);
  });
  it("throws on missing fields", () => {
    expect(() => parseMetaResponse(JSON.stringify({ title: "T" }))).toThrow();
  });
});

describe("prompt builders", () => {
  it("article prompt includes title, category, and notes", () => {
    const p = buildArticlePrompt({ title: "My Post", category: "Buying", rawNotes: "note text" });
    expect(p).toContain("My Post");
    expect(p).toContain("Buying");
    expect(p).toContain("note text");
  });
  it("meta prompt includes the article html", () => {
    expect(buildMetaPrompt({ title: "My Post", category: "Buying" }, "<h2>A</h2>")).toContain("<h2>A</h2>");
  });
});

describe("sanitizeContentHtml", () => {
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
