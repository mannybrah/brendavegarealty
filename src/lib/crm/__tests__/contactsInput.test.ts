import { normalizePhoneInputs, normalizeEmailInputs } from "../contactsInput";

describe("contactsInput", () => {
  it("normalizes, dedupes, and picks one primary phone", () => {
    const out = normalizePhoneInputs([
      { number: "(408) 555-1234", label: "mobile" },
      { number: "+1 408 555 1234", label: "home", isPrimary: true },
      { number: "", label: "work" },
      { number: "5105550000", label: "work", isBad: true },
    ]);
    expect(out).toEqual([
      { number: "4085551234", label: "mobile", isPrimary: true, isBad: false },
      { number: "5105550000", label: "work", isPrimary: false, isBad: true },
    ]);
  });

  it("defaults the first phone to primary and falls back labels", () => {
    const out = normalizePhoneInputs([{ number: "4085550001", label: "nope" }]);
    expect(out[0]).toEqual({ number: "4085550001", label: "mobile", isPrimary: true, isBad: false });
  });

  it("honors an explicit primary that is not first", () => {
    const out = normalizePhoneInputs([{ number: "4085550001" }, { number: "4085550002", isPrimary: true }]);
    expect(out.map((p) => p.isPrimary)).toEqual([false, true]);
  });

  it("tolerates garbage", () => {
    expect(normalizePhoneInputs(undefined)).toEqual([]);
    expect(normalizePhoneInputs([null as never, { number: 5 as never }])).toEqual([]);
  });

  it("normalizes emails", () => {
    const out = normalizeEmailInputs([
      { address: " Bill@Example.com ", label: "personal" },
      { address: "bill@example.com", label: "work", isPrimary: true },
    ]);
    expect(out).toEqual([{ address: "bill@example.com", label: "personal", isPrimary: true, isBad: false }]);
  });
});
