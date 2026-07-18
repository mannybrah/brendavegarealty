import { parseCsv, autoMapColumns, rowsToImportContacts } from "../csv";

const FUB_CSV = `First Name,Last Name,Emails,Phones,Stage,Source,Tags,Background,Created
Maria,Lopez,"maria@example.com, m2@x.com",(408) 555-1212,Lead,Zillow,"buyer, campbell",Met at open house,2024-05-01
,,"",408 555 9999,Past Client,,,"Loyal seller",2020-01-15
"Smith, Jr.",Bob,bob@x.com,,Hot Prospect,Referral,,,2025-12-30`;

describe("parseCsv", () => {
  test("splits simple rows", () => {
    expect(parseCsv("a,b,c\n1,2,3")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  test("handles quoted fields with commas", () => {
    expect(parseCsv('a,"b, c",d')).toEqual([["a", "b, c", "d"]]);
  });

  test("handles escaped quotes inside quoted fields", () => {
    expect(parseCsv('a,"he said ""hi""",c')).toEqual([["a", 'he said "hi"', "c"]]);
  });

  test("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n3,4")).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["3", "4"],
    ]);
  });

  test("handles bare CR line endings", () => {
    expect(parseCsv("a,b\r1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("skips fully-empty rows", () => {
    expect(parseCsv("a,b\n\n1,2\n,\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  test("parses the full FUB fixture into 4 rows (header + 3 data rows)", () => {
    const rows = parseCsv(FUB_CSV);
    expect(rows).toHaveLength(4);
    expect(rows[0]).toEqual([
      "First Name",
      "Last Name",
      "Emails",
      "Phones",
      "Stage",
      "Source",
      "Tags",
      "Background",
      "Created",
    ]);
    expect(rows[3][0]).toBe("Smith, Jr.");
  });
});

describe("autoMapColumns", () => {
  test("maps FUB fixture headers", () => {
    const map = autoMapColumns([
      "First Name",
      "Last Name",
      "Emails",
      "Phones",
      "Stage",
      "Source",
      "Tags",
      "Background",
      "Created",
    ]);
    expect(map).toEqual({
      firstName: 0,
      lastName: 1,
      email: 2,
      phone: 3,
      stage: 4,
      source: 5,
      tags: 6,
      notes: 7,
      createdAt: 8,
    });
  });

  test("is case-insensitive and trims whitespace", () => {
    const map = autoMapColumns([" EMAIL ADDRESS ", " full name ", " NOTE "]);
    expect(map).toEqual({ email: 0, name: 1, notes: 2 });
  });

  test("recognizes header variants", () => {
    expect(autoMapColumns(["Name"])).toEqual({ name: 0 });
    expect(autoMapColumns(["Full Name"])).toEqual({ name: 0 });
    expect(autoMapColumns(["Email"])).toEqual({ email: 0 });
    expect(autoMapColumns(["Phone Number"])).toEqual({ phone: 0 });
    expect(autoMapColumns(["Mobile"])).toEqual({ phone: 0 });
    expect(autoMapColumns(["Lead Source"])).toEqual({ source: 0 });
    expect(autoMapColumns(["Date Added"])).toEqual({ createdAt: 0 });
    expect(autoMapColumns(["Notes"])).toEqual({ notes: 0 });
  });

  test("ignores unrecognized headers", () => {
    expect(autoMapColumns(["Zillow Agent ID", "Email"])).toEqual({ email: 1 });
  });
});

describe("rowsToImportContacts", () => {
  const rows = parseCsv(FUB_CSV);
  const header = rows[0];
  const dataRows = rows.slice(1);
  const map = autoMapColumns(header);
  const contacts = rowsToImportContacts(dataRows, map);

  test("produces 3 contacts", () => {
    expect(contacts).toHaveLength(3);
  });

  test("first row: multi-value email/phone take first value, stage defaults to new, tags split, notes contains background + source", () => {
    const c = contacts[0];
    expect(c.firstName).toBe("Maria");
    expect(c.lastName).toBe("Lopez");
    expect(c.email).toBe("maria@example.com");
    expect(c.phone).toBe("4085551212");
    expect(c.stage).toBe("new");
    expect(c.tags).toEqual(["buyer", "campbell"]);
    expect(c.notes).toContain("Met at open house");
    expect(c.notes).toContain("Zillow");
    expect(c.source).toBe("import");
  });

  test("second row: empty names kept as empty string, stage maps Past Client -> sphere, phone normalized", () => {
    const c = contacts[1];
    expect(c.firstName).toBe("");
    expect(c.lastName).toBe("");
    expect(c.phone).toBe("4085559999");
    expect(c.stage).toBe("sphere");
    expect(c.email).toBeNull();
  });

  test("third row: quoted comma in name preserved, stage maps Hot Prospect -> contacted", () => {
    const c = contacts[2];
    expect(c.firstName).toBe("Smith, Jr.");
    expect(c.lastName).toBe("Bob");
    expect(c.stage).toBe("contacted");
    expect(c.email).toBe("bob@x.com");
    expect(c.phone).toBeNull();
  });

  test("drops rows with no email, phone, or name", () => {
    const noMap = autoMapColumns(["Notes"]);
    const result = rowsToImportContacts([["just a note, nothing else"]], noMap);
    expect(result).toEqual([]);
  });

  test("uses splitName when only 'name' column mapped", () => {
    const nameRows = [["Jane Doe", "jane@example.com"]];
    const nameMap = autoMapColumns(["Name", "Email"]);
    const result = rowsToImportContacts(nameRows, nameMap);
    expect(result[0].firstName).toBe("Jane");
    expect(result[0].lastName).toBe("Doe");
  });

  test("stage mapping table covers all documented values", () => {
    const stageMap = autoMapColumns(["Email", "Stage"]);
    const cases: [string, string][] = [
      ["lead@x.com,Lead", "new"],
      ["hot@x.com,Hot Prospect", "contacted"],
      ["nurture@x.com,Nurture", "contacted"],
      ["contacted@x.com,Contacted", "contacted"],
      ["activeclient@x.com,Active Client", "active"],
      ["active@x.com,Active", "active"],
      ["pending@x.com,Pending", "under_contract"],
      ["closed@x.com,Closed", "closed"],
      ["past@x.com,Past Client", "sphere"],
      ["sphere@x.com,Sphere", "sphere"],
      ["trash@x.com,Trash", "archived"],
      ["archived@x.com,Archived", "archived"],
      ["weird@x.com,SomeUnknownStage", "new"],
    ];
    for (const [csvLine, expected] of cases) {
      const row = parseCsv(csvLine)[0];
      const result = rowsToImportContacts([row], stageMap);
      expect(result[0].stage).toBe(expected);
    }
  });

  test("forces source to import and preserves original source in notes", () => {
    const srcMap = autoMapColumns(["Email", "Source"]);
    const result = rowsToImportContacts([["a@b.com", "Zillow"]], srcMap);
    expect(result[0].source).toBe("import");
    expect(result[0].notes).toContain("Zillow");
  });
});
