import { slugify, readTimeFromHtml } from "@/lib/blogStudio";

describe("slugify", () => {
  it("lowercases, strips punctuation, hyphenates", () => {
    expect(slugify("Saratoga vs. Monte Sereno: A Buyer's Guide!")).toBe("saratoga-vs-monte-sereno-a-buyers-guide");
  });
  it("collapses whitespace and trims hyphens", () => {
    expect(slugify("  Hello   World  ")).toBe("hello-world");
  });
  it("strips curly apostrophes (U+2019)", () => {
    expect(slugify("Buyer's Guide")).toBe("buyers-guide");
  });
});

describe("readTimeFromHtml", () => {
  it("computes minutes at 200 wpm, min 1", () => {
    expect(readTimeFromHtml("<p>word</p>")).toBe("1 min read");
    const words = Array(450).fill("word").join(" ");
    expect(readTimeFromHtml(`<h2>t</h2><p>${words}</p>`)).toBe("3 min read");
  });
});
