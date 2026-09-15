import { parseFilters, buildContactQuery, filtersToParams, activeFilterCount, emptyFilters } from "../filters";

const today = "2026-09-14T20:00:00.000Z";

function q(s: string) {
  return parseFilters(new URLSearchParams(s));
}

describe("filters", () => {
  it("parses everything", () => {
    const f = q(
      "q=bill&stages=new,active&tagsAny=t1,t2&tagsNone=t3&source=zillow&type=buyer&lastComm=over:7&created=within:30&sort=created&dir=asc&limit=50"
    );
    expect(f).toEqual({
      q: "bill",
      stages: ["new", "active"],
      tagsAny: ["t1", "t2"],
      tagsNone: ["t3"],
      source: "zillow",
      type: "buyer",
      lastComm: { op: "over", days: 7 },
      created: { op: "within", days: 30 },
      list: null,
      sort: "created",
      dir: "asc",
      limit: 50,
    });
  });

  it("defaults sort to last_activity desc, limit 500, caps 1000", () => {
    const f = q("limit=5000");
    expect(f.sort).toBe("last_activity");
    expect(f.dir).toBe("desc");
    expect(f.limit).toBe(1000);
    expect(q("").limit).toBe(500);
    expect(q("sort=bogus&lastComm=garbage").sort).toBe("last_activity");
    expect(q("lastComm=garbage").lastComm).toBeNull();
  });

  it("expands a smart list and lets explicit params add to it", () => {
    const f = q("list=nurture&tagsAny=t9");
    const { where, binds } = buildContactQuery(f, today);
    expect(where).toContain("c.stage IN (?)");
    expect(binds).toContain("nurture");
    expect(binds).toContain("t9");
    expect(where).toContain("c.last_communication_at IS NULL OR c.last_communication_at < ?");
  });

  it("explicit stages override the smart list's stages", () => {
    const { binds } = buildContactQuery(q("list=nurture&stages=closed"), today);
    expect(binds).toContain("closed");
    expect(binds).not.toContain("nurture");
  });

  it("builds a LIKE search across names, phones, emails, and relationships with escaping", () => {
    const { where, binds } = buildContactQuery(q("q=50%25"), today);
    expect(where).toContain("EXISTS (SELECT 1 FROM phones p WHERE p.contact_id = c.id AND p.number LIKE ? ESCAPE '\\')");
    expect(where).toContain(
      "EXISTS (SELECT 1 FROM relationships r WHERE r.contact_id = c.id AND (r.first_name LIKE ? ESCAPE '\\' OR r.last_name LIKE ? ESCAPE '\\'))"
    );
    expect(binds[0]).toBe("%50\\%%");
    expect(binds).toHaveLength(8);
  });

  it("builds lastComm never/over/within", () => {
    expect(buildContactQuery(q("lastComm=never"), today).where).toContain("c.last_communication_at IS NULL");
    const over = buildContactQuery(q("lastComm=over:7"), today);
    expect(over.where).toContain("(c.last_communication_at IS NULL OR c.last_communication_at < ?)");
    expect(over.binds[0]).toBe("2026-09-07T20:00:00.000Z");
    const within = buildContactQuery(q("lastComm=within:7"), today);
    expect(within.where).toContain("c.last_communication_at >= ?");
  });

  it("builds created within/over", () => {
    expect(buildContactQuery(q("created=within:30"), today).where).toContain("c.created_at >= ?");
    expect(buildContactQuery(q("created=over:30"), today).where).toContain("c.created_at < ?");
  });

  it("builds tag include/exclude with EXISTS", () => {
    const { where } = buildContactQuery(q("tagsAny=a,b&tagsNone=c"), today);
    expect(where).toContain(
      "EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id IN (?, ?))"
    );
    expect(where).toContain(
      "NOT EXISTS (SELECT 1 FROM contact_tags ct WHERE ct.contact_id = c.id AND ct.tag_id IN (?))"
    );
  });

  it("orders by name using both names, and by stage via sort_order", () => {
    expect(buildContactQuery(q("sort=name&dir=asc"), today).orderBy).toBe(
      "ORDER BY c.first_name COLLATE NOCASE ASC, c.last_name COLLATE NOCASE ASC"
    );
    expect(buildContactQuery(q("sort=stage"), today).orderBy).toBe("ORDER BY s.sort_order DESC, c.last_activity_at DESC");
    expect(buildContactQuery(q("sort=last_communication&dir=asc"), today).orderBy).toBe(
      "ORDER BY (c.last_communication_at IS NULL) DESC, c.last_communication_at ASC"
    );
    expect(buildContactQuery(q("sort=last_communication"), today).orderBy).toBe(
      "ORDER BY (c.last_communication_at IS NULL) ASC, c.last_communication_at DESC"
    );
  });

  it("returns empty where when unfiltered", () => {
    expect(buildContactQuery(q(""), today).where).toBe("");
  });

  it("round-trips through filtersToParams", () => {
    const f = q("q=bill&stages=new&tagsNone=t3&lastComm=never&created=within:7&list=nurture&sort=name&dir=asc");
    expect(parseFilters(filtersToParams(f))).toEqual(f);
  });

  it("counts active filters (search and list excluded)", () => {
    expect(activeFilterCount(emptyFilters())).toBe(0);
    expect(activeFilterCount(q("q=x&list=nurture&stages=new&lastComm=never"))).toBe(2);
  });
});
