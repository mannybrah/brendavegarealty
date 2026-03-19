const SOURCE_LABELS = {
  "qualification-calculator": "Qualification Calculator - brendavegarealty.com",
  "cost-calculator": "Cost Calculator - brendavegarealty.com",
  "phone-call": "Phone Call - brendavegarealty.com",
  "scheduler": "Scheduler - brendavegarealty.com",
  "contact-form": "Contact Form - brendavegarealty.com",
};

const TIMELINE_TAGS = {
  "0-3 months": "timeline-0-3mo",
  "3-6 months": "timeline-3-6mo",
  "6-12 months": "timeline-6-12mo",
  "12+ months": "timeline-12mo+",
  "Just browsing": "timeline-browsing",
};

export async function onRequestPost(context) {
  const { request, env } = context;
  const apiKey = env.FOLLOW_UP_BOSS_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ success: false, error: "CRM not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const body = await request.json();
    const { name, email, phone, source, workingWithAgent, timeline, note } = body;

    if (!name || !email || !phone || !source) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const tags = [source];
    if (workingWithAgent !== undefined) tags.push(workingWithAgent ? "has-agent" : "no-agent");
    if (timeline) tags.push(TIMELINE_TAGS[timeline] || "timeline-unknown");

    const personRes = await fetch("https://api.followupboss.com/v1/people", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName,
        lastName,
        emails: [{ value: email }],
        phones: [{ value: phone }],
        source: SOURCE_LABELS[source] || source,
        tags,
      }),
    });

    if (!personRes.ok) {
      console.error("FUB error:", await personRes.text());
      return new Response(JSON.stringify({ success: false, error: "Failed to create lead" }), {
        status: 500,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    if (note) {
      const person = await personRes.json();
      if (person.id) {
        await fetch("https://api.followupboss.com/v1/notes", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${apiKey}:`)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personId: person.id, body: note }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Lead API error:", err);
    return new Response(JSON.stringify({ success: false, error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
