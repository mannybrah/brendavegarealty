import { NextRequest, NextResponse } from "next/server";
import { createBooking } from "@/lib/google-calendar";
import { createLead } from "@/lib/follow-up-boss";
import { sendConfirmationEmail, sendAgentNotification } from "@/lib/resend";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`booking:${ip}`, 3, 3600000);

  if (!allowed) {
    return NextResponse.json({ error: "Too many booking attempts. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, reason, date, time, consultationType } = body;

    if (!name || !email || !phone || !date || !time) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const booking = await createBooking({ date, time, name, email, reason });
    if (!booking.success) {
      return NextResponse.json({ error: "Unable to book this time slot. Please try another." }, { status: 409 });
    }

    await Promise.allSettled([
      sendConfirmationEmail({ to: email, name, date, time, type: consultationType || "consultation" }),
      sendAgentNotification({
        clientName: name, clientEmail: email, clientPhone: phone,
        date, time, reason: reason || "General consultation", type: consultationType || "consultation",
      }),
    ]);

    createLead({
      name, email, phone,
      message: `Scheduled ${consultationType || "consultation"} on ${date} at ${time}. Reason: ${reason}`,
      source: "brendavegarealty.com - Scheduler",
    }).catch(console.error);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
