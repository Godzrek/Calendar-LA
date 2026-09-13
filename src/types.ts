export type TimeSlot = 'morning' | 'afternoon' | 'evening';

export interface CalendarEvent {
  id: string;
  googleEventId?: string;
  title: string;
  sticker?: string; // Sticker/emoji prefixed before event title
  description?: string;
  location?: string;
  date: string; // YYYY-MM-DD
  slot: TimeSlot; // Primary slot for backwards compatibility
  slots?: TimeSlot[]; // All slots this event spans (e.g. ['morning', 'afternoon'])
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isGoogleEvent?: boolean;
  color?: string;
}

export interface StickerPlacement {
  id: string;
  date: string; // YYYY-MM-DD
  slot?: TimeSlot;
  emoji: string;
  name: string;
  createdAt: number;
}

export interface SlotThemeColors {
  nameTh: string;
  nameEn: string;
  timeRange: string;
  // Empty slot (no events) - pale/soft color
  emptyBg: string;
  emptyBorder: string;
  emptyText: string;
  // Active slot (has events) - saturated/bold color
  activeBg: string;
  activeBorder: string;
  activeText: string;
  activeBadge: string;
  accentDot: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  nameTh: string;
  description: string;
  isDark?: boolean;
  appBg: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  textColor: string;
  mutedText: string;
  primaryBtn: string;
  secondaryBtn: string;
  accentColor: string;
  slots: {
    morning: SlotThemeColors;
    afternoon: SlotThemeColors;
    evening: SlotThemeColors;
  };
}

export interface ShareState {
  version: number;
  ownerName: string;
  sharedAt: string;
  lastSyncedAt?: string;
  themeId: string;
  events: CalendarEvent[];
  stickers: StickerPlacement[];
}

export interface FriendUser {
  friendUid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  themeId?: string;
  addedAt: string;
}
