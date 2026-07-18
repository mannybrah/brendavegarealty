import { dealTemplate } from "../../../worker-lib/dealTemplates";

test("buyer template order and visibility", () => {
  const t = dealTemplate("buyer");
  expect(t).toHaveLength(10);
  expect(t[0].title).toBe("Offer accepted");
  expect(t[9].title).toBe("Close of escrow 🎉");
  expect(t.find((m) => m.title === "Contingency removal")?.clientVisible).toBe(
    false
  );
  expect(t.filter((m) => !m.clientVisible)).toHaveLength(1);
});

test("seller template order and visibility", () => {
  const t = dealTemplate("seller");
  expect(t).toHaveLength(9);
  expect(t[0].title).toBe("Listing agreement signed");
  expect(t[8].title).toBe("Close of escrow 🎉");
  expect(t.find((m) => m.title === "Offer review")?.clientVisible).toBe(false);
  expect(t.filter((m) => !m.clientVisible)).toHaveLength(1);
});

test("dealTemplate returns fresh copies", () => {
  const a = dealTemplate("buyer");
  a[0].title = "mutated";
  expect(dealTemplate("buyer")[0].title).toBe("Offer accepted");
});
