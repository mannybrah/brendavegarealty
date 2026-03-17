interface TimeSlot {
  date: string;
  time: string;
  dateTime: string;
}

const SLOT_DURATION_MINUTES = 30;
const TIMEZONE = "America/Los_Angeles";

const BUSINESS_HOURS = {
  start: 9,
  end: 17,
  days: [1, 2, 3, 4, 5],
};

export async function getAvailableSlots(dateStr: string): Promise<TimeSlot[]> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountKey || !calendarId) {
    return getDefaultSlots(dateStr);
  }

  try {
    const accessToken = await getAccessToken(serviceAccountKey);
    const date = new Date(dateStr + "T00:00:00");
    const dayOfWeek = date.getDay();

    if (!BUSINESS_HOURS.days.includes(dayOfWeek)) {
      return [];
    }

    const timeMin = new Date(dateStr + `T0${BUSINESS_HOURS.start}:00:00-08:00`).toISOString();
    const timeMax = new Date(dateStr + `T${BUSINESS_HOURS.end}:00:00-08:00`).toISOString();

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      console.error("Google Calendar API error");
      return getDefaultSlots(dateStr);
    }

    const data = await response.json();
    const busyTimes = (data.items || []).map((event: { start: { dateTime: string }; end: { dateTime: string } }) => ({
      start: new Date(event.start.dateTime),
      end: new Date(event.end.dateTime),
    }));

    return generateSlots(dateStr, busyTimes);
  } catch (err) {
    console.error("Calendar error:", err);
    return getDefaultSlots(dateStr);
  }
}

export async function createBooking(data: {
  date: string;
  time: string;
  name: string;
  email: string;
  reason: string;
}): Promise<{ success: boolean; error?: string }> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!serviceAccountKey || !calendarId) {
    return { success: true };
  }

  try {
    const accessToken = await getAccessToken(serviceAccountKey);
    const startDateTime = `${data.date}T${data.time}:00`;
    const [hours, minutes] = data.time.split(":").map(Number);
    const endMinutes = minutes + SLOT_DURATION_MINUTES;
    const endHour = hours + Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const endDateTime = `${data.date}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`;

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: `Consultation: ${data.name}`,
          description: `Client: ${data.name}\nEmail: ${data.email}\nReason: ${data.reason}`,
          start: { dateTime: startDateTime, timeZone: TIMEZONE },
          end: { dateTime: endDateTime, timeZone: TIMEZONE },
          attendees: [{ email: data.email }],
        }),
      }
    );

    return { success: response.ok };
  } catch (err) {
    console.error("Calendar booking error:", err);
    return { success: false, error: "Failed to create calendar event" };
  }
}

function getDefaultSlots(dateStr: string): TimeSlot[] {
  const date = new Date(dateStr + "T00:00:00");
  if (!BUSINESS_HOURS.days.includes(date.getDay())) return [];

  const slots: TimeSlot[] = [];
  for (let hour = BUSINESS_HOURS.start; hour < BUSINESS_HOURS.end; hour++) {
    for (let min = 0; min < 60; min += SLOT_DURATION_MINUTES) {
      const time = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      slots.push({ date: dateStr, time, dateTime: `${dateStr}T${time}:00` });
    }
  }
  return slots;
}

function generateSlots(dateStr: string, busyTimes: { start: Date; end: Date }[]): TimeSlot[] {
  const allSlots = getDefaultSlots(dateStr);
  return allSlots.filter((slot) => {
    const slotStart = new Date(slot.dateTime);
    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60000);
    return !busyTimes.some((busy) => slotStart < busy.end && slotEnd > busy.start);
  });
}

async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const { SignJWT, importPKCS8 } = await import("jose");
  const key = JSON.parse(serviceAccountKey);
  const privateKey = await importPKCS8(key.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);

  const jwt = await new SignJWT({
    iss: key.client_email,
    scope: "https://www.googleapis.com/auth/calendar",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(privateKey);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const data = await response.json();
  return data.access_token;
}
