import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
  limit,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { auth } from './firebaseAuth';
import { CalendarEvent, StickerPlacement, FriendUser } from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Connect to the Firestore database: use named database if provided and not default, otherwise standard default
export const db =
  firebaseConfig.firestoreDatabaseId &&
  firebaseConfig.firestoreDatabaseId !== '(default)' &&
  firebaseConfig.firestoreDatabaseId !== ''
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Operation types for strict Firestore error handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Deep sanitize helper to strip any `undefined` values recursively before passing to Firestore
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined) return null as unknown as T;
  return JSON.parse(
    JSON.stringify(obj, (_, value) => (value === undefined ? null : value))
  );
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot as mandated by skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is offline or database initializing.');
    }
    // Expected on fresh database if test/connection doesn't exist
    return false;
  }
}

// Run connection test silently
testFirestoreConnection();

export interface UserProfileData {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  themeId?: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

// Save/Update user profile in Firestore
export async function saveUserProfile(profile: UserProfileData): Promise<void> {
  const path = `users/${profile.uid}`;
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(userRef, sanitizeForFirestore(profile), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Get user profile (for shared view to display owner name and theme)
export async function getUserProfile(userId: string): Promise<UserProfileData | null> {
  const path = `users/${userId}`;
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfileData;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

// Real-time listener for user events
export function subscribeToEvents(
  userId: string,
  onUpdate: (events: CalendarEvent[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/events`;
  const eventsCol = collection(db, 'users', userId, 'events');

  return onSnapshot(
    eventsCol,
    (snapshot) => {
      const list: CalendarEvent[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as CalendarEvent);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Events snapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Save single event to Firestore (Owner only)
export async function saveEventToFirestore(
  userId: string,
  event: CalendarEvent
): Promise<void> {
  const path = `users/${userId}/events/${event.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'events', event.id);
    await setDoc(
      docRef,
      sanitizeForFirestore({
        ...event,
        userId,
        updatedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete event from Firestore (Owner only)
export async function deleteEventFromFirestore(
  userId: string,
  eventId: string
): Promise<void> {
  const path = `users/${userId}/events/${eventId}`;
  try {
    const docRef = doc(db, 'users', userId, 'events', eventId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batch sync all active events to Firestore (for sharing and cross-device sync)
export async function syncAllEventsToFirestore(
  userId: string,
  events: CalendarEvent[]
): Promise<void> {
  if (!userId || events.length === 0) return;
  try {
    const promises = events.map((event) => {
      const docRef = doc(db, 'users', userId, 'events', event.id);
      return setDoc(
        docRef,
        sanitizeForFirestore({
          ...event,
          userId,
          updatedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    });
    await Promise.all(promises);
  } catch (error) {
    console.warn('Batch event sync notice:', error);
  }
}

// Batch sync stickers to Firestore
export async function syncAllStickersToFirestore(
  userId: string,
  stickers: StickerPlacement[]
): Promise<void> {
  if (!userId || stickers.length === 0) return;
  try {
    const promises = stickers.map((sticker) => {
      const docRef = doc(db, 'users', userId, 'stickers', sticker.id);
      return setDoc(docRef, sanitizeForFirestore({ ...sticker, userId }), { merge: true });
    });
    await Promise.all(promises);
  } catch (error) {
    console.warn('Batch sticker sync notice:', error);
  }
}

// Real-time listener for user stickers
export function subscribeToStickers(
  userId: string,
  onUpdate: (stickers: StickerPlacement[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/stickers`;
  const stickersCol = collection(db, 'users', userId, 'stickers');

  return onSnapshot(
    stickersCol,
    (snapshot) => {
      const list: StickerPlacement[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), id: docSnap.id } as StickerPlacement);
      });
      onUpdate(list);
    },
    (error) => {
      console.error('Stickers snapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Save single sticker to Firestore (Owner only)
export async function saveStickerToFirestore(
  userId: string,
  sticker: StickerPlacement
): Promise<void> {
  const path = `users/${userId}/stickers/${sticker.id}`;
  try {
    const docRef = doc(db, 'users', userId, 'stickers', sticker.id);
    await setDoc(docRef, { ...sticker, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Delete sticker from Firestore (Owner only)
export async function deleteStickerFromFirestore(
  userId: string,
  stickerId: string
): Promise<void> {
  const path = `users/${userId}/stickers/${stickerId}`;
  try {
    const docRef = doc(db, 'users', userId, 'stickers', stickerId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batch fetch events for shared view (one-off read)
export async function getSharedEvents(userId: string): Promise<CalendarEvent[]> {
  const path = `users/${userId}/events`;
  try {
    const eventsCol = collection(db, 'users', userId, 'events');
    const snap = await getDocs(eventsCol);
    const list: CalendarEvent[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as CalendarEvent);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Batch fetch stickers for shared view (one-off read)
export async function getSharedStickers(userId: string): Promise<StickerPlacement[]> {
  const path = `users/${userId}/stickers`;
  try {
    const col = collection(db, 'users', userId, 'stickers');
    const snap = await getDocs(col);
    const list: StickerPlacement[] = [];
    snap.forEach((d) => {
      list.push({ ...d.data(), id: d.id } as StickerPlacement);
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// -------------------------------------------------------------
// Consolidated Calendar Snapshot (Fast, Single-Document Cache)
// -------------------------------------------------------------
export interface CalendarSnapshot {
  events: CalendarEvent[];
  stickers: StickerPlacement[];
  themeId?: string;
  ownerName?: string;
  lastSyncedAt: string; // ISO string timestamp
  eventCount: number;
  stickerCount: number;
}

// Save complete calendar snapshot to database
export async function saveCalendarSnapshot(
  userId: string,
  data: {
    events: CalendarEvent[];
    stickers: StickerPlacement[];
    themeId?: string;
    ownerName?: string;
  }
): Promise<string> {
  const nowISO = new Date().toISOString();
  try {
    const docRef = doc(db, 'users', userId, 'calendarData', 'snapshot');
    const snapshotData = sanitizeForFirestore({
      events: data.events || [],
      stickers: data.stickers || [],
      themeId: data.themeId || null,
      ownerName: data.ownerName || null,
      lastSyncedAt: nowISO,
      eventCount: (data.events || []).length,
      stickerCount: (data.stickers || []).length,
      userId,
    });
    await setDoc(docRef, snapshotData, { merge: true });

    // Also update lastSyncedAt & metadata on user's profile document
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      sanitizeForFirestore({
        lastSyncedAt: nowISO,
        eventCount: (data.events || []).length,
        stickerCount: (data.stickers || []).length,
        updatedAt: nowISO,
        ...(data.themeId ? { themeId: data.themeId } : {}),
        ...(data.ownerName ? { displayName: data.ownerName } : {}),
      }),
      { merge: true }
    );
    return nowISO;
  } catch (error) {
    console.warn('saveCalendarSnapshot notice:', error);
    return nowISO;
  }
}

// Get consolidated calendar snapshot from database (atomic single-document read)
export async function getCalendarSnapshot(userId: string): Promise<CalendarSnapshot | null> {
  try {
    const docRef = doc(db, 'users', userId, 'calendarData', 'snapshot');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const events = Array.isArray(data.events) ? data.events : [];
      const stickers = Array.isArray(data.stickers) ? data.stickers : [];
      if (events.length > 0 || stickers.length > 0 || data.lastSyncedAt) {
        return {
          events,
          stickers,
          themeId: data.themeId,
          ownerName: data.ownerName,
          lastSyncedAt: data.lastSyncedAt || '',
          eventCount: data.eventCount || events.length,
          stickerCount: data.stickerCount || stickers.length,
        };
      }
    }

    // Fallback if snapshot document hasn't been written yet or is empty: read subcollections
    const [events, stickers] = await Promise.all([
      getSharedEvents(userId).catch(() => [] as CalendarEvent[]),
      getSharedStickers(userId).catch(() => [] as StickerPlacement[]),
    ]);

    if ((events && events.length > 0) || (stickers && stickers.length > 0)) {
      return {
        events: events || [],
        stickers: stickers || [],
        lastSyncedAt: '',
        eventCount: (events || []).length,
        stickerCount: (stickers || []).length,
      };
    }
    return null;
  } catch (error) {
    console.warn('getCalendarSnapshot notice:', error);
    return null;
  }
}

// Real-time listener for calendar snapshot
export function subscribeToCalendarSnapshot(
  userId: string,
  onUpdate: (snapshot: CalendarSnapshot) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const docRef = doc(db, 'users', userId, 'calendarData', 'snapshot');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate({
          events: Array.isArray(data.events) ? data.events : [],
          stickers: Array.isArray(data.stickers) ? data.stickers : [],
          themeId: data.themeId,
          ownerName: data.ownerName,
          lastSyncedAt: data.lastSyncedAt || '',
          eventCount: data.eventCount || 0,
          stickerCount: data.stickerCount || 0,
        });
      }
    },
    (error) => {
      console.warn('subscribeToCalendarSnapshot notice:', error);
      if (onError) onError(error);
    }
  );
}

// Real-time listener for friends list
export function subscribeToFriends(
  userId: string,
  onUpdate: (friends: FriendUser[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  const path = `users/${userId}/friends`;
  const col = collection(db, 'users', userId, 'friends');

  return onSnapshot(
    col,
    (snapshot) => {
      const list: FriendUser[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...docSnap.data(), friendUid: docSnap.id } as FriendUser);
      });
      // Sort recently added first
      list.sort((a, b) => (b.addedAt || '').localeCompare(a.addedAt || ''));
      onUpdate(list);
    },
    (error) => {
      console.error('Friends snapshot error:', error);
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// Add or update a friend
export async function addFriendToFirestore(
  userId: string,
  friend: FriendUser
): Promise<void> {
  const path = `users/${userId}/friends/${friend.friendUid}`;
  try {
    const docRef = doc(db, 'users', userId, 'friends', friend.friendUid);
    await setDoc(docRef, friend, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Remove a friend
export async function removeFriendFromFirestore(
  userId: string,
  friendUid: string
): Promise<void> {
  const path = `users/${userId}/friends/${friendUid}`;
  try {
    const docRef = doc(db, 'users', userId, 'friends', friendUid);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Search user by email or friend ID
export async function searchUserByEmailOrUid(
  searchTerm: string
): Promise<UserProfileData | null> {
  const clean = searchTerm.trim();
  if (!clean) return null;

  // 1. Try finding directly by UID
  try {
    const byUid = await getUserProfile(clean);
    if (byUid) return byUid;
  } catch {
    // Continue to email search
  }

  // 2. Try finding by email (case-insensitive check)
  const path = 'users';
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', clean.toLowerCase()), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfileData;
    }

    // Try exact casing if not lowercase
    if (clean !== clean.toLowerCase()) {
      const qExact = query(usersCol, where('email', '==', clean), limit(1));
      const snapExact = await getDocs(qExact);
      if (!snapExact.empty) {
        return snapExact.docs[0].data() as UserProfileData;
      }
    }
  } catch (err) {
    console.warn('Search user by email warning:', err);
  }

  return null;
}

// Discover registered users (up to 10 active users to easily connect)
export async function getDiscoverableUsers(
  currentUserId?: string
): Promise<UserProfileData[]> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const results: UserProfileData[] = [];
    snap.forEach((d) => {
      const u = d.data() as UserProfileData;
      if (u && u.uid && u.uid !== currentUserId) {
        results.push(u);
      }
    });
    return results.slice(0, 10);
  } catch (err) {
    console.warn('Get discoverable users:', err);
    return [];
  }
}
