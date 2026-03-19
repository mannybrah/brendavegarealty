interface TimeSlot {
  date: string;
  time: string;
  dateTime: string;
}

const GRAPH_API = "https://graph.microsoft.com/v1.0";
const TIMEZONE = "America/Los_Angeles";
const SLOT_DURATION_MINUTES = 30;
const BUSINESS_HOURS = { start: 9, end: 18, days: [1, 2, 3, 4, 5, 6] }; // Mon-Sat, 9am-6pm

async function getAccessToken(): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Microsoft 365 credentials not configured");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get M365 access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

function generateSlots(dateStr: string, busyTimes: { start: string; end: string }[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const date = new Date(`${dateStr}T00:00:00`);
  const day = date.getDay();

  if (!BUSINESS_HOURS.days.includes(day)) return [];

  for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
    for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
      const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      const slotStart = new Date(`${dateStr}T${time}:00`);
      const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);

      const isBusy = busyTimes.some((busy) => {
        const busyStart = new Date(busy.start);
        const busyEnd = new Date(busy.end);
        return slotStart < busyEnd && slotEnd > busyStart;
      });

      if (!isBusy) {
        slots.push({ date: dateStr, time, dateTime: slotStart.toISOString() });
      }
    }
  }

  return slots;
}

export async function getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
  const userId = process.env.MICROSOFT_USER_ID;

  if (!userId) {
    // Fallback: return all business hours slots
    return generateSlots(dateStr, []);
  }

  try {
    const token = await getAccessToken();

    const startDateTime = `${dateStr}T00:00:00`;
    const endDateTime = `${dateStr}T23:59:59`;

    const response = await fetch(`${GRAPH_API}/users/${userId}/calendar/getSchedule`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: `outlook.timezone="${TIMEZONE}"`,
      },
      body: JSON.stringify({
        schedules: [userId],
        startTime: { dateTime: startDateTime, timeZone: TIMEZONE },
        endTime: { dateTime: endDateTime, timeZone: TIMEZONE },
        availabilityViewInterval: SLOT_DURATION_MINUTES,
      }),
    });

    if (!response.ok) {
      console.error("Graph API getSchedule error:", await response.text());
      return generateSlots(dateStr, []);
    }

    const data = await response.json();
    const scheduleItems = data.value?.[0]?.scheduleItems || [];

    const busyTimes = scheduleItems
      .filter((item: { status: string }) => item.status !== "free")
      .map((item: { start: { dateTime: string }; end: { dateTime: string } }) => ({
        start: item.start.dateTime,
        end: item.end.dateTime,
      }));

    return generateSlots(dateStr, busyTimes);
  } catch (err) {
    console.error("Outlook calendar error:", err);
    return generateSlots(dateStr, []);
  }
}

export async function createBooking(data: {
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  consultationType: string;
}): Promise<{ success: boolean; error?: string }> {
  const userId = process.env.MICROSOFT_USER_ID;

  if (!userId) {
    return { success: false, error: "Calendar not configured" };
  }

  try {
    const token = await getAccessToken();

    const startDateTime = `${data.date}T${data.time}:00`;
    const endDate = new Date(`${startDateTime}`);
    endDate.setMinutes(endDate.getMinutes() + SLOT_DURATION_MINUTES);
    const endDateTime = endDate.toISOString().replace("Z", "");

    const response = await fetch(`${GRAPH_API}/users/${userId}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: `Consultation with ${data.name}`,
        body: {
          contentType: "Text",
          content: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone}\nType: ${data.consultationType}\n\nReason:\n${data.reason}`,
        },
        start: { dateTime: startDateTime, timeZone: TIMEZONE },
        end: { dateTime: endDateTime, timeZone: TIMEZONE },
        attendees: [
          { emailAddress: { address: data.email, name: data.name }, type: "required" },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Graph API create event error:", error);
      return { success: false, error: "Failed to create booking" };
    }

    return { success: true };
  } catch (err) {
    console.error("Outlook booking error:", err);
    return { success: false, error: "Failed to connect to calendar" };
  }
}
