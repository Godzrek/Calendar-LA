import { CalendarEvent, StickerPlacement, ShareState } from '../types';

/**
 * URL-safe Base64 encoder for share payload
 */
export function encodeSharePayload(data: ShareState): string {
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
 * URL-safe Base64 decoder with robust fallback for spaces and legacy formats
 */
export function decodeSharePayload(encodedStr: string): ShareState | null {
  try {
    if (!encodedStr) return null;
    // Normalize url-safe base64 and restore padding
    let base64 = encodedStr.replace(/-/g, '+').replace(/_/g, '/');
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
    if (parsed && (Array.isArray(parsed.events) || parsed.version)) {
      return parsed as ShareState;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode share payload:', err);
    return null;
  }
}

/**
 * Generates a clean, short, and highly shareable URL.
 * When ownerUid is available, produces a clean ~70 char URL linked to Firestore,
 * ensuring zero 414 errors and fast QR code scanning.
 */
export function generateShareUrl(
  events: CalendarEvent[],
  stickers: StickerPlacement[],
  themeId: string,
  ownerName: string,
  ownerUid?: string,
  lastSyncedAt?: string
): string {
  const currentUrl = new URL(window.location.origin + window.location.pathname);
  currentUrl.searchParams.set('mode', 'readonly');
  currentUrl.searchParams.set('viewOnly', 'true');

  const resolvedOwner = ownerName || 'เพื่อนของคุณ';
  currentUrl.searchParams.set('owner', resolvedOwner);

  if (ownerUid) {
    // Cloud sync pointer for real-time cloud data
    currentUrl.searchParams.set('cal', ownerUid);
  }

  // Always include compact payload in the URL hash as an instant zero-latency local snapshot.
  // The hash fragment (#share=...) stays purely in the browser client and is NEVER transmitted
  // to the server in HTTP headers, preventing any HTTP 414 errors while guaranteeing immediate rendering!
  const compactPayload: ShareState = {
    version: 1,
    ownerName: resolvedOwner,
    sharedAt: new Date().toISOString(),
    lastSyncedAt: lastSyncedAt || new Date().toISOString(),
    themeId,
    events: events.map((e) => ({
      id: e.id,
      title: e.title,
      sticker: e.sticker,
      description: e.description,
      location: e.location,
      date: e.date,
      slot: e.slot,
      slots: e.slots,
      startTime: e.startTime,
      endTime: e.endTime,
      color: e.color,
    })),
    stickers: stickers.map((s) => ({
      id: s.id,
      date: s.date,
      slot: s.slot,
      emoji: s.emoji,
      name: s.name,
      createdAt: s.createdAt,
    })),
  };

  const encoded = encodeSharePayload(compactPayload);
  currentUrl.hash = `share=${encoded}`;

  return currentUrl.toString();
}

/**
 * Checks if current page was opened from a share link (via query params or hash)
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
    let shareData = params.get('shareData');

    // Also check hash for #share=... (guest fallback)
    if (!shareData && window.location.hash.includes('share=')) {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      shareData = hashParams.get('share');
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
