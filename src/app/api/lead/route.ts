import { NextRequest, NextResponse } from "next/server";
import { createLeadWithDetails } from "@/lib/follow-up-boss";
import { checkRateLimit } from "@/lib/rate-limit";
import type { LeadRequest } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  "qualification-calculator": "Qualification Calculator - brendavegarealty.com",
  "cost-calculator": "Cost Calculator - brendavegarealty.com",
  "phone-call": "Phone Call - brendavegarealty.com",
  scheduler: "Scheduler - brendavegarealty.com",
  "contact-form": "Contact Form - brendavegarealty.com",
};

const TIMELINE_TAGS: Record<string, string> = {
  "0-3 months": "timeline-0-3mo",
  "3-6 months": "timeline-3-6mo",
  "6-12 months": "timeline-6-12mo",
  "12+ months": "timeline-12mo+",
  "Just browsing": "timeline-browsing",
};

function validateLeadRequest(body: unknown): { valid: true; data: LeadRequest } | { valid: false; error: string } {
  const b = body as Record<string, unknown>;

  if (!b.name || typeof b.name !== "string" || b.name.trim().length < 2) {
    return { valid: false, error: "Name is required (minimum 2 characters)" };
  }
  if (!b.email || typeof b.email !== "string" || !b.email.includes("@")) {
    return { valid: false, error: "Valid email is required" };
  }
  if (!b.phone || typeof b.phone !== "string" || b.phone.replace(/\D/g, "").length < 10) {
    return { valid: false, error: "Valid phone number is required (minimum 10 digits)" };
  }
  if (typeof b.workingWithAgent !== "boolean") {
    return { valid: false, error: "Working with agent field is required" };
  }
  if (!b.timeline || typeof b.timeline !== "string") {
    return { valid: false, error: "Timeline is required" };
  }
  if (!b.source || typeof b.source !== "string") {
    return { valid: false, error: "Source is required" };
  }

  return { valid: true, data: b as unknown as LeadRequest };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
    let kvStore: { get(key: string): Promise<string | null>; put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> } | null = null;
    try {
      const { getRequestContext } = await import("@cloudflare/next-on-pages");
      const { env } = getRequestContext();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kvStore = (env as any).RATE_LIMITS ?? null;
    } catch {
      // getRequestContext() not available in dev mode — fail-open
    }

    const rateCheck = await checkRateLimit(kvStore, `lead:${ip}`, 5, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateLeadRequest(body);
    if (!validation.valid) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
    }

    const { data } = validation;

    // Build tags
    const tags: string[] = [
      data.source,
      data.workingWithAgent ? "has-agent" : "no-agent",
      TIMELINE_TAGS[data.timeline] || "timeline-unknown",
    ];

    // Build note from calculator summary
    let note: string | undefined;
    if (data.calculatorSummary) {
      const s = data.calculatorSummary;
      const lines = ["Calculator Results:"];
      if (s.city) lines.push(`City: ${s.city}`);
      if (s.purchasePrice) lines.push(`Purchase Price: $${s.purchasePrice.toLocaleString()}`);
      if (s.downPayment != null && s.purchasePrice) {
        const pct = ((s.downPayment / s.purchasePrice) * 100).toFixed(0);
        lines.push(`Down Payment: $${s.downPayment.toLocaleString()} (${pct}%)`);
      }
      if (s.loanType) lines.push(`Loan Type: ${s.loanType}`);
      if (s.dtiRatio != null) lines.push(`DTI Ratio: ${s.dtiRatio.toFixed(1)}%`);
      if (s.qualificationStatus) lines.push(`Status: ${s.qualificationStatus}`);
      if (s.monthlyPayment) lines.push(`Monthly Payment: $${s.monthlyPayment.toLocaleString()}`);
      note = lines.join("\n");
    }

    const result = await createLeadWithDetails({
      name: data.name,
      email: data.email,
      phone: data.phone,
      source: SOURCE_LABELS[data.source] || data.source,
      tags,
      note,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Lead API error:", err);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
