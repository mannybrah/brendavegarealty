import { NextRequest, NextResponse } from "next/server";
import { createLead } from "@/lib/follow-up-boss";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const { allowed } = checkRateLimit(`contact:${ip}`, 5, 3600000);

  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, message, type } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required." }, { status: 400 });
    }

    const result = await createLead({
      name, email, phone, message, type,
      source: "brendavegarealty.com - Contact Form",
    });

    if (!result.success) {
      console.error("Lead creation failed:", result.error);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
