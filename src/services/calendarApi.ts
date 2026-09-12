import { CalendarEvent, TimeSlot } from '../types';

export function categorizeTimeToSlot(timeStr: string): TimeSlot {
  // timeStr is expected in HH:mm
  if (!timeStr) return 'morning';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return 'morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function parseGoogleDateTime(dateTimeStr?: string, dateStr?: string): { date: string; time: string } {
  if (dateTimeStr) {
    const d = new Date(dateTimeStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}`,
      };
    }
  }
  if (dateStr) {
    return {
      date: dateStr,
      time: '09:00',
    };
  }
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return { date: `${year}-${month}-${day}`, time: '09:00' };
}

export async function fetchGoogleCalendarEvents(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string
): Promise<CalendarEvent[]> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', timeMinISO);
  url.searchParams.set('timeMax', timeMaxISO);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '250');

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Calendar error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const items = data.items || [];

  return items.map((item: any): CalendarEvent => {
    const startParsed = parseGoogleDateTime(item.start?.dateTime, item.start?.date);
    const endParsed = parseGoogleDateTime(item.end?.dateTime, item.end?.date);
    const slot = categorizeTimeToSlot(startParsed.time);

    return {
      id: `gcal-${item.id}`,
      googleEventId: item.id,
      title: item.summary || '(No title)',
      description: item.description || '',
      location: item.location || '',
      date: startParsed.date,
      slot: slot,
      startTime: startParsed.time,
      endTime: endParsed.time,
      isGoogleEvent: true,
      color: item.colorId,
    };
  });
}

export async function createGoogleCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  }
): Promise<string> {
  const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
  const endDateTime = new Date(`${event.date}T${event.endTime}:00`);

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';

  const body = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone,
    },
  };

  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${errText}`);
  }

  const created = await response.json();
  return created.id;
}

export async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<void> {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Failed to delete Google Calendar event: ${errText}`);
  }
}

export async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  event: {
    title: string;
    description?: string;
    location?: string;
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
  }
): Promise<void> {
  const startDateTime = new Date(`${event.date}T${event.startTime}:00`);
  const endDateTime = new Date(`${event.date}T${event.endTime}:00`);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Bangkok';

  const body = {
    summary: event.title,
    description: event.description || '',
    location: event.location || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone,
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone,
    },
  };

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok && response.status !== 404) {
    const errText = await response.text();
    throw new Error(`Failed to update Google Calendar event: ${errText}`);
  }
}
