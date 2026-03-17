const FUB_API_URL = "https://api.followupboss.com/v1";

export async function createLead(data: {
  name: string;
  email: string;
  phone: string;
  message?: string;
  type?: string;
  source?: string;
}): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.FOLLOW_UP_BOSS_API_KEY;
  if (!apiKey) {
    console.error("Follow Up Boss API key not configured");
    return { success: false, error: "CRM not configured" };
  }

  const nameParts = data.name.trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  try {
    const response = await fetch(`${FUB_API_URL}/events`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${apiKey}:`)}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: data.source || "brendavegarealty.com",
        type: "Registration",
        person: {
          firstName,
          lastName,
          emails: [{ value: data.email }],
          phones: [{ value: data.phone }],
        },
        message: data.message,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("FUB API error:", error);
      return { success: false, error: "Failed to create lead" };
    }

    return { success: true };
  } catch (err) {
    console.error("FUB API error:", err);
    return { success: false, error: "Failed to connect to CRM" };
  }
}
