import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/microsoft-graph";
import { createLeadWithDetails } from "@/lib/follow-up-boss";
import { sendConfirmationEmail, sendAgentNotification } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
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

    const rateCheck = await checkRateLimit(kvStore, `book:${ip}`, 3, 3600);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many booking requests. Please wait." }, { status: 429 });
    }

    const body = await request.json() as Record<string, string>;
    const { date, time, name, email, phone, reason, consultationType } = body;

    if (!date || !time || !name || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create Outlook calendar event
    const booking = await createBooking({ date, time, name, email, phone, reason, consultationType });
    if (!booking.success) {
      return NextResponse.json({ error: booking.error }, { status: 500 });
    }

    // Create FUB lead for scheduler booking (fire and forget)
    createLeadWithDetails({
      name,
      email,
      phone,
      source: "Scheduler - brendavegarealty.com",
      tags: ["scheduler"],
    }).catch((err) => console.error("FUB lead from scheduler failed:", err));

    // Send confirmation emails (fire and forget)
    const hour = parseInt(time.split(":")[0]);
    const min = time.split(":")[1];
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const timeDisplay = `${displayHour}:${min} ${ampm} PT`;

    await Promise.allSettled([
      sendConfirmationEmail({ to: email, name, date, time: timeDisplay, type: consultationType }),
      sendAgentNotification({ clientName: name, clientEmail: email, clientPhone: phone, date, time: timeDisplay, reason, type: consultationType }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Failed to book consultation" }, { status: 500 });
  }
}
