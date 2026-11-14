import {
  AGENT_STATUS_OPTIONS,
  agentStatusLabel,
  cleanFileName,
  cleanReportUrl,
  hasPdfSignature,
  inboxBucket,
  maxBytes,
  validateIntake,
} from "../homeClarity";
import { buildHcEmail, type HcIntakeRow } from "../homeClarityEmail";

const KEY = "abcdefghijklmnop1234";
const base = {
  propertyAddress: "  123 Main St,   San Jose, CA 95125 ",
  fullName: "Test Buyer",
  email: "Buyer@Example.com",
  phone: "",
  preferredContact: "email",
  agentStatus: null,
  questions: "",
  fileName: "TDS package.pdf",
  fileBytes: 50_000,
  idempotencyKey: KEY,
  consent: true,
};
const bytes = (s: string) => new TextEncoder().encode(s);

describe("validateIntake", () => {
  it("accepts a valid request and tidies the fields", () => {
    const r = validateIntake(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.propertyAddress).toBe("123 Main St, San Jose, CA 95125");
    expect(r.value.email).toBe("buyer@example.com");
    expect(r.value.phone).toBeNull();
    expect(r.value.agentStatus).toBeNull();
    expect(r.value.questions).toBeNull();
  });

  it("requires the core fields", () => {
    const r = validateIntake({ idempotencyKey: KEY });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.errors).sort()).toEqual(["consent", "email", "file", "fullName", "preferredContact", "propertyAddress"]);
  });

  it("rejects a malformed email", () => {
    for (const email of ["nope", "a@b", "a b@c.com", "@c.com"]) {
      const r = validateIntake({ ...base, email });
      expect(r.ok).toBe(false);
    }
  });

  it("requires a phone number only when phone is the preferred contact", () => {
    expect(validateIntake({ ...base, preferredContact: "phone" })).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
    expect(validateIntake({ ...base, preferredContact: "phone", phone: "(408) 555-0100" }).ok).toBe(true);
    expect(validateIntake({ ...base, phone: "123" })).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
  });

  it("keeps each agent-status answer exactly and never invents one", () => {
    for (const { value } of AGENT_STATUS_OPTIONS) {
      const r = validateIntake({ ...base, agentStatus: value });
      expect(r.ok && r.value.agentStatus).toBe(value);
    }
    const r = validateIntake({ ...base, agentStatus: "something-else" });
    expect(r.ok && r.value.agentStatus).toBeNull();
    expect(agentStatusLabel(null)).toBe("Not answered");
    expect(agentStatusLabel("represented")).toBe("Yes, I\u2019m already working with an agent");
  });

  it("checks the file", () => {
    expect(validateIntake({ ...base, fileBytes: 0 })).toMatchObject({ ok: false, errors: { file: expect.stringContaining("empty") } });
    expect(validateIntake({ ...base, fileName: "", fileBytes: 0 })).toMatchObject({ ok: false, errors: { file: "Choose your disclosure PDF." } });
    expect(validateIntake({ ...base, fileBytes: maxBytes(25) + 1 })).toMatchObject({ ok: false, errors: { file: expect.stringContaining("25 MB") } });
    expect(validateIntake({ ...base, fileName: "photo.jpg" })).toMatchObject({ ok: false, errors: { file: "Upload a PDF file." } });
    expect(validateIntake({ ...base, fileBytes: maxBytes(25) }).ok).toBe(true);
  });

  it("requires consent and a well-formed idempotency key", () => {
    expect(validateIntake({ ...base, consent: "yes" })).toMatchObject({ ok: false, errors: { consent: expect.any(String) } });
    expect(validateIntake({ ...base, idempotencyKey: "short" })).toMatchObject({ ok: false, errors: { form: expect.any(String) } });
  });

  it("handles long and odd input without throwing", () => {
    expect(validateIntake({ ...base, propertyAddress: "x".repeat(301) }).ok).toBe(false);
    const r = validateIntake({ ...base, questions: "q".repeat(5000), propertyAddress: "12 Oak\u0000Ave\n\nUnit 4" });
    expect(r.ok && r.value.questions?.length).toBe(2000);
    expect(r.ok && r.value.propertyAddress).toBe("12 Oak Ave Unit 4");
  });

  it("keeps only known campaign fields", () => {
    const r = validateIntake({ ...base, utm: { utm_source: "ig", evil: "x", utm_campaign: " fall " } });
    expect(r.ok && r.value.utm).toEqual({ utm_source: "ig", utm_campaign: "fall" });
  });
});

describe("file helpers", () => {
  it("cleans suspicious file names", () => {
    expect(cleanFileName("../../etc/passwd")).toBe("passwd.pdf");
    expect(cleanFileName("C:/Users/x/<script>alert(1)<.pdf")).toBe("scriptalert(1).pdf");
    expect(cleanFileName("")).toBe("disclosure.pdf");
    expect(cleanFileName("a".repeat(300) + ".pdf").length).toBeLessThanOrEqual(124);
  });

  it("recognizes real PDFs by signature, not by name", () => {
    expect(hasPdfSignature(bytes("%PDF-1.7 ..."))).toBe(true);
    expect(hasPdfSignature(bytes("  junk %PDF-1.4"))).toBe(true);
    expect(hasPdfSignature(bytes("PK not a pdf, just renamed"))).toBe(false);
    expect(hasPdfSignature(new Uint8Array(0))).toBe(false);
  });

  it("only accepts http(s) report links", () => {
    expect(cleanReportUrl("https://buyerbrief.app/share/abc")).toBe("https://buyerbrief.app/share/abc");
    expect(cleanReportUrl("javascript:alert(1)")).toBeNull();
    expect(cleanReportUrl("not a url")).toBeNull();
    expect(cleanReportUrl("")).toBeNull();
  });
});

describe("inboxBucket", () => {
  it("sorts requests into the inbox tabs", () => {
    expect(inboxBucket({ report_status: "not_started", contact_status: "new" })).toBe("new");
    expect(inboxBucket({ report_status: "in_progress", contact_status: "new" })).toBe("in_progress");
    expect(inboxBucket({ report_status: "ready", contact_status: "outreach_pending" })).toBe("ready");
    expect(inboxBucket({ report_status: "sent", contact_status: "contacted" })).toBe("contacted");
    expect(inboxBucket({ report_status: "not_started", contact_status: "completed" })).toBe("done");
  });
});

describe("buildHcEmail", () => {
  const intake = {
    id: "11111111-1111-1111-1111-111111111111",
    property_address: '9 <b>Elm</b> "St"',
    full_name: "Pat <script>x</script> Lee",
    email: "pat@example.com",
    phone: null,
    preferred_contact: "email",
    agent_status: "represented",
    questions: "Is the roof <new>?",
  } as HcIntakeRow;

  it("escapes buyer-supplied text and makes no review or timing promise", () => {
    const receipt = buildHcEmail("buyer_receipt", intake, "https://example.test")!;
    expect(receipt.to).toBe("buyer");
    expect(receipt.subject).toBe("Your Home Clarity request received");
    expect(receipt.html).not.toContain("<b>Elm</b>");
    expect(receipt.html).toContain("&lt;b&gt;Elm&lt;/b&gt;");
    expect(receipt.html).toContain("Brenda will personally reach out");
    expect(receipt.html).not.toMatch(/reviewed|within \d+|hours|instant/i);
  });

  it("shows Brenda the agent status and links to the studio, with no attachment", () => {
    const note = buildHcEmail("agent_new_request", intake, "https://example.test")!;
    expect(note.to).toBe("agent");
    expect(note.subject).toBe("New Home Clarity request");
    expect(note.html).toContain("already working with an agent");
    expect(note.html).toContain("https://example.test/studio/home-clarity?id=11111111-1111-1111-1111-111111111111");
    expect(note.html).not.toContain("<script>");
  });

  it("returns null for an unknown kind", () => {
    expect(buildHcEmail("nope", intake, "https://example.test")).toBeNull();
  });
});
