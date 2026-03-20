interface Env {
  FOLLOW_UP_BOSS_API_KEY: string;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
      return new Response(null, { headers: corsHeaders() });
    }

    // Contact form
    if (url.pathname === "/api/contact" && request.method === "POST") {
      return handleContact(request, env);
    }

    // Lead capture (calculators, phone modal, etc.)
    if (url.pathname === "/api/lead" && request.method === "POST") {
      return handleLead(request, env);
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function sendToFUB(apiKey: string, body: object): Promise<Response> {
  return fetch("https://api.followupboss.com/v1/events", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${apiKey}:`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// POST /api/contact — contact form submissions
async function handleContact(request: Request, env: Env): Promise<Response> {
  try {
    const { name, email, phone, message, type } = await request.json() as {
      name: string;
      email: string;
      phone: string;
      message?: string;
      type?: string;
    };

    if (!name || !email || !phone) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (!env.FOLLOW_UP_BOSS_API_KEY) {
      return jsonResponse({ error: "CRM not configured" }, 500);
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const fubRes = await sendToFUB(env.FOLLOW_UP_BOSS_API_KEY, {
      source: "brendavegarealty.com",
      type: "Registration",
      person: {
        firstName,
        lastName,
        emails: [{ value: email }],
        phones: [{ value: phone }],
        tags: [type || "buyer", "contact-form"],
      },
      message: message || `New ${type || "buyer"} lead from contact form`,
    });

    if (!fubRes.ok) {
      console.error("FUB error:", await fubRes.text());
      return jsonResponse({ error: "Failed to submit" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("Contact error:", err);
    return jsonResponse({ error: "Server error" }, 500);
  }
}

// POST /api/lead — lead capture modal submissions
async function handleLead(request: Request, env: Env): Promise<Response> {
  try {
    const { name, email, phone, workingWithAgent, timeline, source, calculatorSummary } =
      await request.json() as {
        name: string;
        email: string;
        phone: string;
        workingWithAgent?: boolean;
        timeline?: string;
        source?: string;
        calculatorSummary?: Record<string, unknown>;
      };

    if (!name || !email || !phone) {
      return jsonResponse({ error: "Missing required fields" }, 400);
    }

    if (!env.FOLLOW_UP_BOSS_API_KEY) {
      return jsonResponse({ error: "CRM not configured" }, 500);
    }

    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    const tags = [source || "website"];
    if (timeline) tags.push(`timeline-${timeline}`);
    if (workingWithAgent === false) tags.push("no-agent");
    if (workingWithAgent === true) tags.push("has-agent");

    let messageText = `Lead from ${source || "website"}`;
    if (timeline) messageText += ` | Timeline: ${timeline}`;
    if (workingWithAgent !== undefined) messageText += ` | Working with agent: ${workingWithAgent ? "Yes" : "No"}`;
    if (calculatorSummary) {
      const s = calculatorSummary;
      if (s.purchasePrice) messageText += ` | Budget: $${Number(s.purchasePrice).toLocaleString()}`;
      if (s.monthlyPayment) messageText += ` | Monthly: $${Number(s.monthlyPayment).toLocaleString()}`;
      if (s.qualificationStatus) messageText += ` | Status: ${s.qualificationStatus}`;
      if (s.city) messageText += ` | City: ${s.city}`;
    }

    const fubRes = await sendToFUB(env.FOLLOW_UP_BOSS_API_KEY, {
      source: "brendavegarealty.com",
      type: "Registration",
      person: {
        firstName,
        lastName,
        emails: [{ value: email }],
        phones: [{ value: phone }],
        tags,
      },
      message: messageText,
    });

    if (!fubRes.ok) {
      console.error("FUB error:", await fubRes.text());
      return jsonResponse({ error: "Failed to submit" }, 500);
    }

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("Lead error:", err);
    return jsonResponse({ error: "Server error" }, 500);
  }
}
