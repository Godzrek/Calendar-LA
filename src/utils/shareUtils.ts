import { CalendarEvent, StickerPlacement, ShareState } from '../types';

export function encodeSharePayload(data: ShareState): string {
  try {
    const jsonStr = JSON.stringify(data);
    const base64 = btoa(
      encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      })
    );
    return encodeURIComponent(base64);
  } catch (err) {
    console.error('Failed to encode share payload:', err);
    return '';
  }
}

export function decodeSharePayload(encodedStr: string): ShareState | null {
  try {
    const base64 = decodeURIComponent(encodedStr);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(atob(base64), (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.events)) {
      return parsed as ShareState;
    }
    return null;
  } catch (err) {
    console.error('Failed to decode share payload:', err);
    return null;
  }
}

export function generateShareUrl(
  events: CalendarEvent[],
  stickers: StickerPlacement[],
  themeId: string,
  ownerName: string,
  ownerUid?: string
): string {
  const currentUrl = new URL(window.location.origin + window.location.pathname);
  currentUrl.searchParams.set('mode', 'readonly');
  currentUrl.searchParams.set('viewOnly', 'true');

  if (ownerUid) {
    // If user has a Firebase UID, share by UID for live cloud sync
    currentUrl.searchParams.set('cal', ownerUid);
    currentUrl.searchParams.set('owner', encodeURIComponent(ownerName || 'เพื่อนของคุณ'));
  }

  // Also include lightweight encoded snapshot as backup
  const payload: ShareState = {
    version: 1,
    ownerName: ownerName || 'เพื่อนของคุณ',
    sharedAt: new Date().toISOString(),
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

  const encoded = encodeSharePayload(payload);
  currentUrl.searchParams.set('shareData', encoded);

  return currentUrl.toString();
}

export function checkIsViewOnlyFromUrl(): {
  isViewOnly: boolean;
  calOwnerUid: string | null;
  ownerName: string | null;
  sharedState: ShareState | null;
} {
  try {
    const params = new URLSearchParams(window.location.search);
    const isViewOnly =
      params.get('viewOnly') === 'true' ||
      params.get('mode') === 'readonly' ||
      !!params.get('cal');
    const calOwnerUid = params.get('cal');
    const rawOwner = params.get('owner');
    const ownerName = rawOwner ? decodeURIComponent(rawOwner) : null;
    const shareData = params.get('shareData');

    let sharedState: ShareState | null = null;
    if (shareData) {
      sharedState = decodeSharePayload(shareData);
    }

    if (isViewOnly) {
      return {
        isViewOnly: true,
        calOwnerUid,
        ownerName: ownerName || sharedState?.ownerName || 'เพื่อนของคุณ',
        sharedState,
      };
    }
  } catch (e) {
    console.warn('Error reading share data from URL:', e);
  }
  return { isViewOnly: false, calOwnerUid: null, ownerName: null, sharedState: null };
}
