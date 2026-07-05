import { parseStatValue } from "@/lib/countUpParse";

describe("parseStatValue", () => {
  it("parses $1.5M", () => {
    expect(parseStatValue("$1.5M")).toEqual({ prefix: "$", num: 1.5, suffix: "M", decimals: 1 });
  });
  it("parses 100%", () => {
    expect(parseStatValue("100%")).toEqual({ prefix: "", num: 100, suffix: "%", decimals: 0 });
  });
  it("parses 4+", () => {
    expect(parseStatValue("4+")).toEqual({ prefix: "", num: 4, suffix: "+", decimals: 0 });
  });
  it("falls back to zero-count for non-numeric", () => {
    expect(parseStatValue("N/A")).toEqual({ prefix: "N/A", num: 0, suffix: "", decimals: 0 });
  });
});
