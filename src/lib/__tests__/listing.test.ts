import fs from "fs";
import path from "path";
import {
  extractRelaPhotoUrls,
  listingSlug,
  futureOpenHouses,
  stripHtmlToText,
  parseExtractResponse,
  LISTING_STATUS_LABELS,
} from "@/lib/listing";

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, "../__fixtures__/rela-listing.html"),
  "utf8"
);

describe("extractRelaPhotoUrls", () => {
  const urls = extractRelaPhotoUrls(fixtureHtml);

  it("returns a non-empty, capped list", () => {
    expect(urls.length).toBeGreaterThan(0);
    expect(urls.length).toBeLessThanOrEqual(30);
  });

  it("only returns property-image paths", () => {
    for (const u of urls) expect(u).toMatch(/\/property-images\//);
  });

  it("excludes agent headshots, favicons, and logos", () => {
    for (const u of urls) {
      expect(u).not.toMatch(/agent-headshots/i);
      expect(u).not.toMatch(/favicon/i);
      expect(u).not.toMatch(/wl_footer_logos/i);
    }
  });

  it("normalizes every style variant to kb_full", () => {
    for (const u of urls) expect(u).toMatch(/\/styles\/kb_full\/s3\//);
  });

  it("strips query strings", () => {
    for (const u of urls) expect(u).not.toContain("?");
  });

  it("dedupes repeated URLs", () => {
    expect(new Set(urls).size).toBe(urls.length);
  });
});

describe("listingSlug", () => {
  it("slugifies the address", () => {
    expect(listingSlug("15540 Armsby Ln")).toBe("15540-armsby-ln");
  });
  it("falls back to city when address slugifies empty", () => {
    expect(listingSlug("!!!", "Morgan Hill")).toBe("morgan-hill");
  });
  it("falls back to 'listing' when nothing usable is given", () => {
    expect(listingSlug("!!!")).toBe("listing");
  });
});

describe("futureOpenHouses", () => {
  const openHouses = [
    { date: "2026-07-01", start: "13:00", end: "16:00" },
    { date: "2026-07-10", start: "10:00", end: "12:00" },
    { date: "2026-07-05", start: "09:00", end: "11:00" },
    { date: "2026-07-05", start: "14:00", end: "16:00" },
  ];
  it("drops past dates and sorts the rest ascending", () => {
    const result = futureOpenHouses(openHouses, "2026-07-05");
    expect(result).toEqual([
      { date: "2026-07-05", start: "09:00", end: "11:00" },
      { date: "2026-07-05", start: "14:00", end: "16:00" },
      { date: "2026-07-10", start: "10:00", end: "12:00" },
    ]);
  });
  it("returns empty when all are past", () => {
    expect(futureOpenHouses(openHouses, "2026-08-01")).toEqual([]);
  });
});

describe("stripHtmlToText", () => {
  it("strips tags, scripts, and styles, and collapses whitespace", () => {
    const html = "<html><head><style>.x{}</style></head><body><script>alert(1)</script><p>Hello   <b>world</b></p></body></html>";
    expect(stripHtmlToText(html)).toBe("Hello world");
  });
  it("caps output length", () => {
    const long = "<p>" + "word ".repeat(20000) + "</p>";
    expect(stripHtmlToText(long, 100).length).toBe(100);
  });
});

describe("parseExtractResponse", () => {
  const valid = {
    address: "15540 Armsby Ln",
    city: "Morgan Hill",
    price: "",
    beds: 5,
    baths: 3,
    sqft: 2812,
    lotSize: "1.8 acres",
    description: "A lovely home.",
    features: ["Fiber internet", "Dual HVAC"],
  };
  it("parses a valid response", () => {
    const parsed = parseExtractResponse(JSON.stringify(valid));
    expect(parsed.address).toBe("15540 Armsby Ln");
    expect(parsed.beds).toBe(5);
    expect(parsed.sqft).toBe(2812);
    expect(parsed.features).toEqual(["Fiber internet", "Dual HVAC"]);
  });
  it("nulls out non-finite numbers", () => {
    const parsed = parseExtractResponse(JSON.stringify({ ...valid, beds: null, baths: null }));
    expect(parsed.beds).toBeNull();
    expect(parsed.baths).toBeNull();
  });
  it("throws on missing required fields", () => {
    expect(() => parseExtractResponse(JSON.stringify({ city: "X" }))).toThrow();
  });
  it("throws on invalid JSON", () => {
    expect(() => parseExtractResponse("not json")).toThrow();
  });
});

describe("LISTING_STATUS_LABELS", () => {
  it("covers all statuses", () => {
    expect(LISTING_STATUS_LABELS["just-listed"]).toBe("Just Listed");
    expect(LISTING_STATUS_LABELS.sold).toBe("Sold");
  });
});
