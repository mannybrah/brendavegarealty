import { normalizePhone, normalizeEmail, splitName } from "../normalize";

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
