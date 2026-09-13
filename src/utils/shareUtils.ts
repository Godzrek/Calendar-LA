import { CalendarEvent, StickerPlacement, ShareState, TimeSlot } from '../types';

/**
 * Compact tuple formats to achieve minimum URL payload size:
 * Event tuple: [id, title, date, slot, startTime, endTime, sticker, description, location, color, slots]
 * Sticker tuple: [id, date, slot, emoji, name]
 */
type CompactEventTuple = [
  string, // 0: id
  string, // 1: title
  string, // 2: date
  string, // 3: slot
  string, // 4: startTime
  string, // 5: endTime
  string, // 6: sticker
  string, // 7: description
  string, // 8: location
  string, // 9: color
  string  // 10: slots (comma-separated)
];

type CompactStickerTuple = [
  string, // 0: id
  string, // 1: date
  string, // 2: slot
  string, // 3: emoji
  string  // 4: name
];

interface CompactSharePayload {
  v: number;           // version (2)
  n: string;           // ownerName
  t: string;           // themeId
  s: string;           // lastSyncedAt ISO
  e: CompactEventTuple[];
  k: CompactStickerTuple[];
}

/**
 * Convert CalendarEvents to compact tuple array
 */
function compressEvents(events: CalendarEvent[]): CompactEventTuple[] {
  return events.map((e) => [
    e.id || '',
    e.title || '',
    e.date || '',
    e.slot || 'morning',
    e.startTime || '09:00',
    e.endTime || '10:00',
    e.sticker || '',
    e.description || '',
    e.location || '',
    e.color || '',
    e.slots && Array.isArray(e.slots) ? e.slots.join(',') : (e.slot || 'morning'),
  ]);
}

/**
 * Convert compact tuple array back to CalendarEvents
 */
function decompressEvents(arr: CompactEventTuple[]): CalendarEvent[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => {
    const primarySlot = (item[3] || 'morning') as TimeSlot;
    const slots = item[10]
      ? (item[10].split(',').filter(Boolean) as TimeSlot[])
      : [primarySlot];

    return {
      id: item[0] || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: item[1] || '(ไม่มีชื่อนัดหมาย)',
      date: item[2] || '',
      slot: primarySlot,
      startTime: item[4] || '09:00',
      endTime: item[5] || '10:00',
      sticker: item[6] || undefined,
      description: item[7] || undefined,
      location: item[8] || undefined,
      color: item[9] || undefined,
      slots: slots.length > 0 ? slots : [primarySlot],
    };
  });
}

/**
 * Convert StickerPlacements to compact tuple array
 */
function compressStickers(stickers: StickerPlacement[]): CompactStickerTuple[] {
  return stickers.map((s) => [
    s.id || '',
    s.date || '',
    s.slot || '',
    s.emoji || '',
    s.name || '',
  ]);
}

/**
 * Convert compact tuple array back to StickerPlacements
 */
function decompressStickers(arr: CompactStickerTuple[]): StickerPlacement[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((item) => ({
    id: item[0] || `stk-${Date.now()}`,
    date: item[1] || '',
    slot: (item[2] as TimeSlot) || undefined,
    emoji: item[3] || '',
    name: item[4] || '',
    createdAt: Date.now(),
  }));
}

/**
 * URL-safe Base64 encoder for share payload
 */
export function encodeSharePayload(data: ShareState | CompactSharePayload): string {
  try {
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    // Convert to URL-safe base64
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  } catch (err) {
    console.error('Failed to encode share payload:', err);
    return '';
  }
}

/**
 * URL-safe Base64 decoder supporting both Version 2 (compact tuples) and Version 1 (object arrays)
 */
export function decodeSharePayload(encodedStr: string): ShareState | null {
  try {
    if (!encodedStr) return null;
    // Normalize url-safe base64 and restore padding
    let base64 = encodedStr.trim().replace(/-/g, '+').replace(/_/g, '/');
    // Also handle case where URLSearchParams converted '+' into ' '
    base64 = base64.replace(/ /g, '+');
    while (base64.length % 4) {
      base64 += '=';
    }

    const decodedStr = atob(base64);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(decodedStr, (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    if (!parsed) return null;

    // Check if Version 2 compact format
    if (parsed.v === 2 && Array.isArray(parsed.e)) {
      const decompressedEvts = decompressEvents(parsed.e);
      const decompressedStks = decompressStickers(parsed.k || []);
      return {
        version: 2,
        ownerName: parsed.n || 'เพื่อนของคุณ',
        sharedAt: parsed.s || new Date().toISOString(),
        themeId: parsed.t,
        lastSyncedAt: parsed.s || new Date().toISOString(),
        events: decompressedEvts,
        stickers: decompressedStks,
      };
    }

    // Version 1 format
    if (Array.isArray(parsed.events) || parsed.version) {
      return parsed as ShareState;
    }

    return null;
  } catch (err) {
    console.error('Failed to decode share payload:', err);
    return null;
  }
}

/**
 * Generates a bulletproof, 100% reliable Share URL.
 * - Embeds compact payload in query parameter (?d=...) so messaging apps (LINE, Messenger, etc.) NEVER strip it
 * - ALSO embeds in hash (#share=...) as immediate client-side fallback
 * - Keeps ownerUid for Firestore real-time synchronization if configured
 */
export function generateShareUrl(
  events: CalendarEvent[],
  stickers: StickerPlacement[],
  themeId: string,
  ownerName: string,
  ownerUid?: string,
  lastSyncedAt?: string
): string {
  try {
    let base = 'http://localhost:3000/';
    if (typeof window !== 'undefined' && window.location) {
      if (window.location.origin && window.location.origin !== 'null') {
        base = `${window.location.origin}${window.location.pathname || '/'}`;
      } else if (window.location.href) {
        base = window.location.href.split('?')[0].split('#')[0];
      }
    }

    // If running inside AI Studio development container (ais-dev-),
    // automatically route to the public preview domain (ais-pre-) so external mobile phones can open it!
    if (base.includes('ais-dev-')) {
      base = base.replace('ais-dev-', 'ais-pre-');
    }

    const currentUrl = new URL(base);
    currentUrl.searchParams.delete('d');
    currentUrl.searchParams.delete('shareData');
    currentUrl.searchParams.delete('data');
    currentUrl.searchParams.delete('share');

    currentUrl.searchParams.set('mode', 'readonly');
    currentUrl.searchParams.set('viewOnly', 'true');

    const resolvedOwner = ownerName || 'เพื่อนของคุณ';
    currentUrl.searchParams.set('owner', resolvedOwner);

    if (ownerUid) {
      currentUrl.searchParams.set('cal', ownerUid);
    } else {
      currentUrl.searchParams.delete('cal');
    }

    // Create ultra-compact v2 payload
    const compactPayload: CompactSharePayload = {
      v: 2,
      n: resolvedOwner,
      t: themeId || 'modern-clean',
      s: lastSyncedAt || new Date().toISOString(),
      e: compressEvents(Array.isArray(events) ? events : []),
      k: compressStickers(Array.isArray(stickers) ? stickers : []),
    };

    const encoded = encodeSharePayload(compactPayload);

    if (encoded) {
      // Put in query param '?d=' (survives messaging app redirects and link scrapers)
      currentUrl.searchParams.set('d', encoded);
      // Also put in hash '#share=' (instant zero-server evaluation)
      currentUrl.hash = `share=${encoded}`;
    }

    return currentUrl.toString();
  } catch (err) {
    console.error('generateShareUrl error:', err);
    try {
      return typeof window !== 'undefined' ? window.location.href : 'http://localhost:3000/';
    } catch {
      return 'http://localhost:3000/';
    }
  }
}

/**
 * Checks if current page was opened from a share link.
 * Extracts payload from:
 * 1. URL search parameters: '?d=', '?shareData=', '?data='
 * 2. URL hash: '#share=...', or raw hash
 */
export function checkIsViewOnlyFromUrl(): {
  isViewOnly: boolean;
  calOwnerUid: string | null;
  ownerName: string | null;
  sharedState: ShareState | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const calOwnerUid = params.get('cal');
    const rawOwner = params.get('owner');

    // Check all possible query parameter keys
    let shareData = params.get('d') || params.get('shareData') || params.get('data');

    // Also check hash for #share=... (or direct hash payload)
    if (!shareData && window.location.hash) {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash.includes('share=')) {
        shareData = hash.split('share=')[1]?.split('&')[0];
      } else if (hash.length > 20) {
        shareData = hash;
      }
    }

    const isViewOnly =
      params.get('viewOnly') === 'true' ||
      params.get('mode') === 'readonly' ||
      !!calOwnerUid ||
      !!shareData;

    let sharedState: ShareState | null = null;
    if (shareData) {
      sharedState = decodeSharePayload(shareData);
    }

    if (isViewOnly) {
      return {
        isViewOnly: true,
        calOwnerUid,
        ownerName: rawOwner || sharedState?.ownerName || 'เพื่อนของคุณ',
        sharedState,
      };
    }
  } catch (e) {
    console.warn('Error reading share data from URL:', e);
  }
  return { isViewOnly: false, calOwnerUid: null, ownerName: null, sharedState: null };
}
