import { normalizePhone, normalizeEmail, splitName, STAGES, STAGE_LABELS } from "../normalize";

test("normalizePhone strips formatting and country code", () => {
  expect(normalizePhone("(501) 827-9619")).toBe("5018279619");
  expect(normalizePhone("+1 501-827-9619")).toBe("5018279619");
  expect(normalizePhone("15018279619")).toBe("5018279619");
  expect(normalizePhone("")).toBeNull();
  expect(normalizePhone(undefined)).toBeNull();
});

test("normalizeEmail lowercases and trims", () => {
  expect(normalizeEmail(" Maria@Example.COM ")).toBe("maria@example.com");
  expect(normalizeEmail("")).toBeNull();
});

test("splitName", () => {
  expect(splitName("Maria Lopez Garcia")).toEqual({ firstName: "Maria", lastName: "Lopez Garcia" });
  expect(splitName("Maria")).toEqual({ firstName: "Maria", lastName: "" });
  expect(splitName("  ")).toEqual({ firstName: "", lastName: "" });
});

test("STAGES exact strings and order", () => {
  expect(STAGES).toEqual(["new", "contacted", "active", "under_contract", "closed", "sphere", "archived"]);
});

test("STAGE_LABELS exact values", () => {
  expect(STAGE_LABELS).toEqual({
    new: "New",
    contacted: "Contacted",
    active: "Active",
    under_contract: "Under Contract",
    closed: "Closed",
    sphere: "Sphere / Past",
    archived: "Archived",
  });
});

test("normalizePhone keeps 11 digits when not US-1-prefixed", () => {
  expect(normalizePhone("22345678901")).toBe("22345678901");
});

test("splitName collapses internal whitespace", () => {
  expect(splitName("Maria   Lopez  Garcia")).toEqual({ firstName: "Maria", lastName: "Lopez Garcia" });
});
