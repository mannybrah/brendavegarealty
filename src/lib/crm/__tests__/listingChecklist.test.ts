import { CHECKLIST_PHASES, listingChecklist } from "../../../worker-lib/listingChecklist";

test("phase labels", () => {
  expect(CHECKLIST_PHASES).toEqual({
    1: "Listing kickoff",
    2: "Week before market",
    3: "Contract to close",
    4: "Marketing menu",
  });
});

test("counts per phase and total", () => {
  const items = listingChecklist();
  expect(items).toHaveLength(95);
  expect(items.filter((i) => i.phase === 1)).toHaveLength(19);
  expect(items.filter((i) => i.phase === 2)).toHaveLength(19);
  expect(items.filter((i) => i.phase === 3)).toHaveLength(37);
  expect(items.filter((i) => i.phase === 4)).toHaveLength(20);
});

test("first/last titles per phase", () => {
  const items = listingChecklist();
  const phase1 = items.filter((i) => i.phase === 1);
  expect(phase1[0].title).toBe("Send signed listing agreement to all parties");
  expect(phase1[phase1.length - 1].title).toBe("Input house information into MLS");

  const phase2 = items.filter((i) => i.phase === 2);
  expect(phase2[0].title).toBe("Schedule staging items; staging instructions ready");
  expect(phase2[phase2.length - 1].title).toBe("Follow-up call to all leads; send disclosure package link");

  const phase3 = items.filter((i) => i.phase === 3);
  expect(phase3[0].title).toBe("Create escrow calendar and send to all parties");
  expect(phase3[phase3.length - 1].title).toBe("Send client testimonial link");

  const phase4 = items.filter((i) => i.phase === 4);
  expect(phase4[0].title).toBe("Professional photos ($)");
  expect(phase4[phase4.length - 1].title).toBe("1-page farm flyer");
});

test("listingChecklist returns fresh copies", () => {
  const a = listingChecklist();
  a[0].title = "mutated";
  expect(listingChecklist()[0].title).toBe("Send signed listing agreement to all parties");
});
