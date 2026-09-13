import { CalendarEvent } from '../types';

/**
 * Normalizes an event title by stripping emojis, symbols, and extra whitespace,
 * and converting to lowercase for robust duplicate comparison.
 */
export function normalizeEventTitle(title?: string): string {
  if (!title) return '';
  return title
    .replace(/^[\p{Emoji}\p{Symbol}\s\-:|•]+/gu, '')
    .trim()
    .toLowerCase();
}

/**
 * Checks if two calendar events represent the same activity:
 * 1. Matching Google Event IDs
 * 2. Or matching Date + Normalized Title + Slot/Time
 */
export function areEventsDuplicate(a: CalendarEvent, b: CalendarEvent): boolean {
  if (!a || !b) return false;
  if (a.id === b.id) return true;

  // 1. Check Google Event ID match
  if (a.googleEventId && b.googleEventId && a.googleEventId === b.googleEventId) {
    return true;
  }
  if (a.googleEventId && (b.id === a.googleEventId || b.id === `gcal-${a.googleEventId}`)) {
    return true;
  }
  if (b.googleEventId && (a.id === b.googleEventId || a.id === `gcal-${b.googleEventId}`)) {
    return true;
  }

  // 2. Must be on the exact same date (YYYY-MM-DD)
  if (a.date !== b.date) return false;

  const titleA = normalizeEventTitle(a.title);
  const titleB = normalizeEventTitle(b.title);

  if (!titleA || !titleB) return false;

  // If titles match (e.g. "นัดหมอ" and "นัดหมอ" or "ประชุมทีม" and "ประชุมทีม")
  if (titleA === titleB) {
    // Check if slot matches
    if (a.slot && b.slot && a.slot === b.slot) return true;

    // Check if start time matches
    if (a.startTime && b.startTime && a.startTime === b.startTime) return true;

    // Check if multi-slot overlap exists
    if (a.slots && b.slot && a.slots.includes(b.slot)) return true;
    if (b.slots && a.slot && b.slots.includes(a.slot)) return true;

    // If one event has default times (e.g. 09:00) or missing exact time on the same date with exact title
    return true;
  }

  return false;
}

/**
 * Merges two duplicate events into a single unified event:
 * - Prioritizes Google Calendar status and metadata
 * - Preserves any user stickers, custom descriptions, or location tags
 */
export function mergeDuplicateEvents(existing: CalendarEvent, incoming: CalendarEvent): CalendarEvent {
  const preferIncomingGoogle = incoming.isGoogleEvent || (!existing.isGoogleEvent && !!incoming.googleEventId);
  const base = preferIncomingGoogle ? incoming : existing;
  const secondary = preferIncomingGoogle ? existing : incoming;

  return {
    ...base,
    // Preserve sticker if the other event had one
    sticker: base.sticker || secondary.sticker,
    // Preserve description if other had richer text
    description: base.description || secondary.description,
    // Preserve location
    location: base.location || secondary.location,
    // Merge slot coverage
    slots: base.slots || secondary.slots,
    googleEventId: base.googleEventId || secondary.googleEventId,
    isGoogleEvent: base.isGoogleEvent || secondary.isGoogleEvent,
  };
}

/**
 * Deduplicates an array of events so that only ONE event is kept
 * when duplicates exist between Firebase and Google Calendar.
 */
export function deduplicateEvents(events: CalendarEvent[]): CalendarEvent[] {
  if (!Array.isArray(events) || events.length <= 1) {
    return events || [];
  }

  const result: CalendarEvent[] = [];

  for (const event of events) {
    const existingIndex = result.findIndex((existing) => areEventsDuplicate(existing, event));
    if (existingIndex === -1) {
      result.push(event);
    } else {
      // Merge into a single event and replace the duplicate
      result[existingIndex] = mergeDuplicateEvents(result[existingIndex], event);
    }
  }

  return result;
}
