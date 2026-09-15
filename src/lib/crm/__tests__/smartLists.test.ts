import { SMART_LISTS, smartListById } from "../smartLists";

describe("smartLists", () => {
  it("has the five seeded lists", () => {
    expect(SMART_LISTS.map((l) => l.id)).toEqual([
      "needs_contact",
      "potential_prospects",
      "current_clients",
      "nurture",
      "past_clients",
    ]);
  });
  it("needs_contact targets new leads with no recent communication", () => {
    const l = smartListById("needs_contact")!;
    expect(l.filter.stages).toEqual(["new", "attempted_contact"]);
    expect(l.filter.created).toEqual({ op: "within", days: 11 });
    expect(l.filter.lastComm).toEqual({ op: "over", days: 1 });
  });
  it("every list has a description", () => {
    for (const l of SMART_LISTS) expect(l.description.length).toBeGreaterThan(10);
  });
  it("returns undefined for unknown ids", () => {
    expect(smartListById("nope")).toBeUndefined();
  });
});
