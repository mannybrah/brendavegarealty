import { renderPortalPage, renderPortalExpiredPage } from "../../../worker-lib/portalPage";
import type { PortalData, DealRow, MilestoneRow } from "../portalTypes";

function makeDeal(overrides: Partial<DealRow> = {}): DealRow {
  return {
    id: "deal-1",
    contact_id: "contact-1",
    side: "buyer",
    property_address: "123 Main St, Springfield",
    status: "active",
    target_close_date: "2026-08-15",
    portal_token: "abc123token456",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeMilestone(overrides: Partial<MilestoneRow> = {}): MilestoneRow {
  return {
    id: "m-1",
    deal_id: "deal-1",
    title: "Offer accepted",
    kind: "paperwork",
    date: "2026-06-05",
    status: "done",
    client_visible: 1,
    notes: "",
    sort_order: 0,
    reminded_day_before: null,
    reminded_day_of: null,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("renderPortalPage", () => {
  test("escapes a malicious milestone title (XSS)", () => {
    const data: PortalData = {
      deal: makeDeal(),
      contactFirstName: "Jamie",
      milestones: [
        makeMilestone({
          id: "m-xss",
          title: "<script>alert(1)</script>",
          status: "upcoming",
          sort_order: 0,
        }),
      ],
    };

    const html = renderPortalPage(data);

    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>alert");
  });

  test("never renders milestone notes, even when a hidden milestone's title is sensitive", () => {
    // findDealByPortalToken already filters to client_visible=1 before this
    // function ever sees the data — a hidden milestone's title should never
    // appear because it is never included in the fixture passed in here.
    const hiddenTitle = "SECRET-CONTINGENCY-DETAIL";
    const data: PortalData = {
      deal: makeDeal(),
      contactFirstName: "Jamie",
      milestones: [
        makeMilestone({
          id: "m-visible",
          title: "Home inspection",
          status: "upcoming",
          notes: "Client is anxious about radon — do not mention numbers.",
          sort_order: 0,
        }),
      ],
    };

    const html = renderPortalPage(data);

    expect(html).not.toContain(hiddenTitle);
    expect(html).not.toContain("radon");
    expect(html).not.toContain("anxious");
  });

  test("progress math: 3 of 6 visible milestones done -> 50% in style attr", () => {
    const statuses = ["done", "done", "done", "upcoming", "upcoming", "upcoming"];
    const data: PortalData = {
      deal: makeDeal(),
      contactFirstName: "Jamie",
      milestones: statuses.map((status, i) =>
        makeMilestone({ id: `m-${i}`, title: `Step ${i}`, status, sort_order: i })
      ),
    };

    const html = renderPortalPage(data);
    expect(html).toMatch(/width:\s*50%/);
  });

  test("includes noindex meta, headline with first name, and contact buttons", () => {
    const data: PortalData = {
      deal: makeDeal({ side: "seller" }),
      contactFirstName: "Taylor",
      milestones: [makeMilestone({ status: "upcoming" })],
    };

    const html = renderPortalPage(data);
    expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
    expect(html).toContain("Taylor&#39;s home sale");
    expect(html).toContain("tel:+15018279619");
    expect(html).toContain("sms:+15018279619");
    expect(html).toContain("mailto:brenda.vega@c21anew.com");
  });

  test("formats YYYY-MM-DD milestone dates without timezone off-by-one", () => {
    const data: PortalData = {
      deal: makeDeal(),
      contactFirstName: "Jamie",
      milestones: [makeMilestone({ date: "2026-07-24", status: "upcoming" })],
    };
    const html = renderPortalPage(data);
    expect(html).toContain("Jul 24");
  });
});

describe("renderPortalExpiredPage", () => {
  test("renders a branded expired message with contact buttons", () => {
    const html = renderPortalExpiredPage();
    expect(html).toContain("no longer active");
    expect(html).toContain("tel:+15018279619");
    expect(html).toContain("sms:+15018279619");
    expect(html).toContain("mailto:brenda.vega@c21anew.com");
  });
});
