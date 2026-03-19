import { NextRequest, NextResponse } from "next/server";
import { createLeadWithDetails } from "@/lib/follow-up-boss";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, string>;
    const { name, email, phone, message, type } = body;

    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
    }

    const result = await createLeadWithDetails({
      name,
      email,
      phone,
      source: "Contact Form - brendavegarealty.com",
      tags: ["contact-form", type ? `inquiry-${type}` : "inquiry-other"],
      note: message ? `Contact form message:\n${message}` : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
