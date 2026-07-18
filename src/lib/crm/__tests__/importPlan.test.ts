import { planImport, ExistingContact } from "../importPlan";
import { ImportContact } from "../csv";

const NOW = "2026-07-18T12:00:00.000Z";

function contact(overrides: Partial<ImportContact>): ImportContact {
  return {
    firstName: "",
    lastName: "",
    email: null,
    phone: null,
    stage: "new",
    source: "import",
    tags: [],
    notes: "",
    createdAt: null,
    ...overrides,
  };
}

function makeIdSeq(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

test("fresh row with no existing match produces an insert with correct fields", () => {
  const rows = [
    contact({ firstName: "Alex", lastName: "Rivera", email: "alex@example.com", phone: "5551234567", tags: ["buyer"], notes: "Interested in condos" }),
  ];
  const plan = planImport(rows, [], NOW, makeIdSeq());

  expect(plan.created).toBe(1);
  expect(plan.merged).toBe(0);
  expect(plan.skipped).toBe(0);
  expect(plan.inserts).toEqual([
    {
      id: "id-1",
      first_name: "Alex",
      last_name: "Rivera",
      email: "alex@example.com",
      phone: "5551234567",
      stage: "new",
      source: "import",
      tags: JSON.stringify(["buyer"]),
      notes: "Interested in condos",
      created_at: NOW,
      updated_at: NOW,
      last_activity_at: NOW,
    },
  ]);
  expect(plan.updates).toEqual([]);
});

test("row createdAt is honored for created_at/last_activity_at but updated_at is always nowIso", () => {
  const rows = [contact({ firstName: "Jamie", email: "jamie@example.com", createdAt: "2020-01-01T00:00:00.000Z" })];
  const plan = planImport(rows, [], NOW, makeIdSeq());

  expect(plan.inserts[0].created_at).toBe("2020-01-01T00:00:00.000Z");
  expect(plan.inserts[0].last_activity_at).toBe("2020-01-01T00:00:00.000Z");
  expect(plan.inserts[0].updated_at).toBe(NOW);
});

test("existing-email match produces an update with fill-only-blank, notes append, tags union, updated_at nowIso", () => {
  const existing: ExistingContact[] = [
    {
      id: "existing-1",
      first_name: "",
      last_name: "Rivera",
      email: "alex@example.com",
      phone: null,
      tags: JSON.stringify(["buyer"]),
      notes: "Original note",
    },
  ];
  const rows = [
    contact({
      firstName: "Alex",
      lastName: "Ignored Because Existing Has One",
      email: "alex@example.com",
      phone: "5559876543",
      tags: ["hot"],
      notes: "New note",
    }),
  ];
  const plan = planImport(rows, existing, NOW, makeIdSeq());

  expect(plan.created).toBe(0);
  expect(plan.merged).toBe(1);
  expect(plan.skipped).toBe(0);
  expect(plan.inserts).toEqual([]);
  expect(plan.updates).toEqual([
    {
      id: "existing-1",
      first_name: "Alex", // filled in because existing was blank
      last_name: "Rivera", // kept because existing had a value
      email: "alex@example.com",
      phone: "5559876543", // filled in because existing was null
      tags: JSON.stringify(["buyer", "hot"]),
      notes: "Original note\nNew note",
      updated_at: NOW,
      last_activity_at: NOW,
    },
  ]);
});

test("intra-payload duplicate email produces one insert, merged for the second row, notes merged into the pending insert", () => {
  const rows = [
    contact({ firstName: "Sam", email: "sam@example.com", notes: "First contact" }),
    contact({ firstName: "Samuel", lastName: "Lee", email: "sam@example.com", notes: "Second contact", tags: ["referral"] }),
  ];
  const plan = planImport(rows, [], NOW, makeIdSeq());

  expect(plan.created).toBe(1);
  expect(plan.merged).toBe(1);
  expect(plan.skipped).toBe(0);
  expect(plan.inserts).toHaveLength(1);
  expect(plan.updates).toHaveLength(0);
  expect(plan.inserts[0]).toMatchObject({
    id: "id-1",
    first_name: "Sam", // first row's name kept (not blank, so second row's name ignored)
    last_name: "Lee", // filled in from second row since first was blank
    email: "sam@example.com",
    notes: "First contact\nSecond contact",
    tags: JSON.stringify(["referral"]),
  });
});

test("intra-payload duplicate matched by phone (not email) also merges into the pending insert", () => {
  const rows = [
    contact({ firstName: "Taylor", phone: "5551112222" }),
    contact({ firstName: "T.", lastName: "Morgan", phone: "5551112222" }),
  ];
  const plan = planImport(rows, [], NOW, makeIdSeq());

  expect(plan.created).toBe(1);
  expect(plan.merged).toBe(1);
  expect(plan.inserts).toHaveLength(1);
  expect(plan.inserts[0].last_name).toBe("Morgan");
});

test("invalid row (no name, no email, no phone) is skipped and does not affect other counters", () => {
  const rows = [
    contact({}),
    contact({ firstName: "Valid", email: "valid@example.com" }),
  ];
  const plan = planImport(rows, [], NOW, makeIdSeq());

  expect(plan.skipped).toBe(1);
  expect(plan.created).toBe(1);
  expect(plan.merged).toBe(0);
  expect(plan.inserts).toHaveLength(1);
});

test("row matching an existing contact by phone only (different email) still merges into that existing row", () => {
  const existing: ExistingContact[] = [
    { id: "existing-9", first_name: "Pat", last_name: "Kim", email: null, phone: "5550001111", tags: "[]", notes: "" },
  ];
  const rows = [contact({ firstName: "Pat", lastName: "Kim", phone: "5550001111", email: "pat@example.com" })];
  const plan = planImport(rows, existing, NOW, makeIdSeq());

  expect(plan.merged).toBe(1);
  expect(plan.created).toBe(0);
  expect(plan.updates[0].email).toBe("pat@example.com");
});

test("two rows that each independently match the same existing contact (once by email, once by phone) accumulate into a single update, not two", () => {
  const existing: ExistingContact[] = [
    { id: "existing-5", first_name: "", last_name: "", email: "morgan@example.com", phone: "5553334444", tags: "[]", notes: "" },
  ];
  const rows = [
    contact({ firstName: "Morgan", email: "morgan@example.com", notes: "note A" }),
    contact({ lastName: "Rivera", phone: "5553334444", notes: "note B" }),
  ];
  const plan = planImport(rows, existing, NOW, makeIdSeq());

  expect(plan.merged).toBe(2);
  expect(plan.created).toBe(0);
  expect(plan.updates).toHaveLength(1);
  expect(plan.updates[0]).toMatchObject({
    id: "existing-5",
    first_name: "Morgan",
    last_name: "Rivera",
    notes: "note A\nnote B",
  });
});

test("counters are exact across a mixed batch", () => {
  const existing: ExistingContact[] = [
    { id: "existing-1", first_name: "Known", last_name: "Person", email: "known@example.com", phone: null, tags: "[]", notes: "" },
  ];
  const rows = [
    contact({}), // skipped
    contact({ firstName: "New1", email: "new1@example.com" }), // created
    contact({ firstName: "New1Dup", email: "new1@example.com" }), // merged into pending
    contact({ firstName: "Known2", email: "known@example.com" }), // merged into existing
  ];
  const plan = planImport(rows, existing, NOW, makeIdSeq());

  expect(plan).toMatchObject({ created: 1, merged: 2, skipped: 1 });
  expect(plan.inserts).toHaveLength(1);
  expect(plan.updates).toHaveLength(1);
});
