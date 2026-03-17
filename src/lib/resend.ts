export async function sendConfirmationEmail(data: {
  to: string;
  name: string;
  date: string;
  time: string;
  type: string;
}): Promise<{ success: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Resend API key not configured");
    return { success: false };
  }

  const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Brenda Vega Realty <noreply@brendavegarealty.com>",
        to: [data.to],
        subject: `Consultation Confirmed \u2014 ${formattedDate}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0F1D35;">Your consultation is confirmed!</h2>
            <p>Hi ${data.name},</p>
            <p>Your ${data.type} consultation with Brenda Vega is confirmed:</p>
            <div style="background: #F8F5EF; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Date:</strong> ${formattedDate}</p>
              <p style="margin: 4px 0;"><strong>Time:</strong> ${data.time} PT</p>
              <p style="margin: 4px 0;"><strong>Type:</strong> ${data.type}</p>
            </div>
            <p>If you need to reschedule, please reply to this email or call (501) 827-9619.</p>
            <p>Looking forward to speaking with you!</p>
            <p style="color: #C8A55B;">\u2014 Brenda Vega, REALTOR\u00AE</p>
          </div>
        `,
      }),
    });
    return { success: response.ok };
  } catch {
    return { success: false };
  }
}

export async function sendAgentNotification(data: {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  date: string;
  time: string;
  reason: string;
  type: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const formattedDate = new Date(data.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Brenda Vega Realty <noreply@brendavegarealty.com>",
      to: ["brenda.vega@c21anew.com"],
      subject: `New Consultation Booked \u2014 ${data.clientName}`,
      html: `
        <div style="font-family: sans-serif;">
          <h2>New Consultation Booked</h2>
          <p><strong>Client:</strong> ${data.clientName}</p>
          <p><strong>Email:</strong> ${data.clientEmail}</p>
          <p><strong>Phone:</strong> ${data.clientPhone}</p>
          <p><strong>Date:</strong> ${formattedDate} at ${data.time} PT</p>
          <p><strong>Type:</strong> ${data.type}</p>
          <p><strong>Reason:</strong> ${data.reason}</p>
        </div>
      `,
    }),
  });
}
