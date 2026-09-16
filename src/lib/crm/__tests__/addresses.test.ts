import { normalizeAddressInputs } from "../contactsInput";

describe("normalizeAddressInputs", () => {
  it("trims, drops empties, dedupes case-insensitively, defaults label, picks one primary", () => {
    const out = normalizeAddressInputs([
      { address: "  123 Main St, San Jose, CA ", label: "" },
      { address: "123 main st, san jose, ca", label: "Mailing" },
      { address: "", label: "Investment" },
      { address: "9 Oak Ave", label: "Investment", isPrimary: true },
    ]);
    expect(out).toEqual([
      { address: "123 Main St, San Jose, CA", label: "Home", isPrimary: false },
      { address: "9 Oak Ave", label: "Investment", isPrimary: true },
    ]);
  });

  it("keeps free-text labels (capped at 40 chars) and defaults the first row to primary", () => {
    const out = normalizeAddressInputs([{ address: "1 A St", label: "Second home in Tahoe that we visit every winter season" }]);
    expect(out[0].label.length).toBe(40);
    expect(out[0].isPrimary).toBe(true);
  });

  it("tolerates garbage", () => {
    expect(normalizeAddressInputs(undefined)).toEqual([]);
    expect(normalizeAddressInputs([null as never, { address: 5 as never }])).toEqual([]);
  });
});
