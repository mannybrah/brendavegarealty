import { isSystemStage, nextStageId, slugifyStageName, PALETTE_KEYS, SYSTEM_STAGE_IDS } from "../stages";

describe("stages", () => {
  it("knows the five system stages", () => {
    expect(SYSTEM_STAGE_IDS).toEqual(["new", "active", "under_contract", "closed", "archived"]);
    expect(isSystemStage("closed")).toBe(true);
    expect(isSystemStage("nurture")).toBe(false);
  });

  it("slugifies names", () => {
    expect(slugifyStageName("Attempted Contact")).toBe("attempted_contact");
    expect(slugifyStageName("  Met w/ Customer!! ")).toBe("met_w_customer");
    expect(slugifyStageName("###")).toBe("stage");
  });

  it("suffixes on collision", () => {
    expect(nextStageId(["new", "nurture"], "Nurture")).toBe("nurture_2");
    expect(nextStageId(["nurture", "nurture_2"], "Nurture")).toBe("nurture_3");
    expect(nextStageId([], "Nurture")).toBe("nurture");
  });

  it("exposes the palette keys", () => {
    expect(PALETTE_KEYS).toContain("gold");
    expect(PALETTE_KEYS).toContain("coral");
    expect(PALETTE_KEYS.length).toBe(11);
  });
});
