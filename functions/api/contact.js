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
    const { name, email, phone, message, type } = body;

    if (!name || !email || !phone) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const tags = ["contact-form", type ? `inquiry-${type}` : "inquiry-other"];

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
        source: "Contact Form - brendavegarealty.com",
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

    if (message) {
      const person = await personRes.json();
      if (person.id) {
        await fetch("https://api.followupboss.com/v1/notes", {
          method: "POST",
          headers: {
            Authorization: `Basic ${btoa(`${apiKey}:`)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ personId: person.id, body: `Contact form message:\n${message}` }),
        }).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    console.error("Contact API error:", err);
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
