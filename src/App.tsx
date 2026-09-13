import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot, FriendUser } from './types';
import { DEFAULT_THEME, getThemeById, THEMES } from './constants/themes';
import {
  getCalendarGrid,
  THAI_MONTHS,
  formatYearThai,
  formatDateKey,
  formatLastUpdatedThai,
} from './utils/dateUtils';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  setAccessToken,
  requestGoogleCalendarAccess,
  parseFirebaseAuthError,
  AuthErrorInfo,
} from './services/firebaseAuth';
import {
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  InsufficientScopeError,
  ApiDisabledError,
} from './services/calendarApi';
import {
  checkIsViewOnlyFromUrl,
  generateShareUrl,
} from './utils/shareUtils';
import {
  saveUserProfile,
  getUserProfile,
  subscribeToEvents,
  saveEventToFirestore,
  deleteEventFromFirestore,
  syncAllEventsToFirestore,
  syncAllStickersToFirestore,
  subscribeToStickers,
  saveStickerToFirestore,
  deleteStickerFromFirestore,
  getSharedEvents,
  getSharedStickers,
  subscribeToFriends,
  saveCalendarSnapshot,
  getCalendarSnapshot,
  subscribeToCalendarSnapshot,
  CalendarSnapshot,
} from './services/firestoreService';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayScheduleCard } from './components/DayScheduleCard';
import { AddEventModal } from './components/AddEventModal';
import { EventDetailModal } from './components/EventDetailModal';
import { StickerPickerModal } from './components/StickerPickerModal';
import { ShareModal } from './components/ShareModal';
import { ThemeSelector } from './components/ThemeSelector';
import { SlotListModal } from './components/SlotListModal';
import { FriendsModal } from './components/FriendsModal';
import { CompareScheduleModal } from './components/CompareScheduleModal';
import { AuthTroubleshootModal } from './components/AuthTroubleshootModal';
import { CalendarScopeModal } from './components/CalendarScopeModal';
import { deduplicateEvents } from './utils/eventDeduplication';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Share2,
  Palette,
  Plus,
  RefreshCw,
  LogOut,
  Eye,
  CheckCircle2,
  Cloud,
  ExternalLink,
  ShieldCheck,
  User as UserIcon,
  Users,
  Sparkles,
  UserCheck,
  Edit3,
  Check,
  X,
  Clock,
} from 'lucide-react';

const STORAGE_EVENTS_KEY = 'slot_calendar_events_v2';
const STORAGE_STICKERS_KEY = 'slot_calendar_stickers_v2';
const STORAGE_THEME_KEY = 'slot_calendar_theme_id_v2';
const STORAGE_OWNER_NAME_KEY = 'slot_calendar_owner_name_v2';
const STORAGE_LAST_SYNCED_KEY = 'slot_calendar_last_synced_at_v2';

export default function App() {
  // Navigation Date (Defaults to current date / today)
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() => {
    const today = new Date();
    return formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Check initial share status synchronously on mount
  const initialShare = useMemo(() => checkIsViewOnlyFromUrl(), []);

  // Theme (defaults to Minimalist or saved or shared)
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    if (initialShare.isViewOnly && initialShare.sharedState?.themeId) {
      return getThemeById(initialShare.sharedState.themeId);
    }
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_THEME_KEY) : null;
    return saved ? getThemeById(saved) : DEFAULT_THEME;
  });
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Auth & Google Calendar
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);

  // View-Only Share Mode (Friends can view but CANNOT edit)
  const [isViewOnly, setIsViewOnly] = useState(() => initialShare.isViewOnly);
  const [sharedOwnerName, setSharedOwnerName] = useState<string>(
    () => initialShare.ownerName || initialShare.sharedState?.ownerName || 'เพื่อนของคุณ'
  );
  const [customOwnerName, setCustomOwnerName] = useState<string>(() => {
    return localStorage.getItem(STORAGE_OWNER_NAME_KEY) || '';
  });
  const [isEditingOwnerName, setIsEditingOwnerName] = useState(false);
  const [tempOwnerName, setTempOwnerName] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Last Synced / Saved Timestamp from Firestore database
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(() => {
    return (
      initialShare.sharedState?.lastSyncedAt ||
      (typeof window !== 'undefined'
        ? localStorage.getItem(STORAGE_LAST_SYNCED_KEY) || ''
        : '')
    );
  });

  // Events & Stickers State - initialized with shared data instantly if available
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    if (initialShare.isViewOnly && initialShare.sharedState?.events) {
      return initialShare.sharedState.events;
    }
    return [];
  });
  const [stickers, setStickers] = useState<StickerPlacement[]>(() => {
    if (initialShare.isViewOnly && initialShare.sharedState?.stickers) {
      return initialShare.sharedState.stickers;
    }
    return [];
  });

  // Friend System State
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<FriendUser | null>(null);
  const [comparingFriend, setComparingFriend] = useState<FriendUser | null>(null);
  const [friendEvents, setFriendEvents] = useState<CalendarEvent[]>([]);
  const [friendStickers, setFriendStickers] = useState<StickerPlacement[]>([]);
  const [initialFriendSearchTerm, setInitialFriendSearchTerm] = useState<string>('');
  const [isRefreshingFriend, setIsRefreshingFriend] = useState(false);

  // Firestore sync state tracking
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);

  // Modals State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDate, setAddModalDate] = useState('');
  const [addModalSlot, setAddModalSlot] = useState<TimeSlot>('morning');
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const [stickerModalOpen, setStickerModalOpen] = useState(false);
  const [stickerModalDate, setStickerModalDate] = useState('');
  const [stickerModalSlot, setStickerModalSlot] = useState<TimeSlot | undefined>(undefined);

  const [slotListModalOpen, setSlotListModalOpen] = useState(false);
  const [slotListDate, setSlotListDate] = useState('');
  const [slotListSlot, setSlotListSlot] = useState<TimeSlot>('morning');
  const [slotListEvents, setSlotListEvents] = useState<CalendarEvent[]>([]);

  // Auth Troubleshooting Modal
  const [authErrorModalOpen, setAuthErrorModalOpen] = useState(false);
  const [authErrorInfo, setAuthErrorInfo] = useState<AuthErrorInfo | null>(null);

  // Google Calendar Scope / API Enable Modal
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false);
  const [scopeModalApiDisabled, setScopeModalApiDisabled] = useState(false);
  const [scopeModalApiUrl, setScopeModalApiUrl] = useState<string | undefined>(undefined);

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSharedLoading, setIsSharedLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Schedule Owner Name logic: follows user owner -> [Name] Calendar
  const calendarOwnerName = viewingFriend
    ? viewingFriend.displayName || viewingFriend.email?.split('@')[0] || 'เพื่อน'
    : isViewOnly
    ? sharedOwnerName || 'เพื่อน'
    : customOwnerName || user?.displayName || user?.email?.split('@')[0] || 'My';

  const calendarHeaderTitle = `${calendarOwnerName} Calendar`;

  // Shared calendar fetch/refresh logic for view-only mode
  const loadSharedCalendarData = useCallback(
    async (isManualRefresh = false) => {
      const { isViewOnly: viewOnlyFromUrl, calOwnerUid, ownerName, sharedState } =
        checkIsViewOnlyFromUrl();

      if (!viewOnlyFromUrl) return;

      setIsViewOnly(true);
      const name = ownerName || sharedState?.ownerName || 'เพื่อนของคุณ';
      setSharedOwnerName(name);

      if (sharedState?.themeId) {
        setTheme(getThemeById(sharedState.themeId));
      }

      const applySharedData = (evs: CalendarEvent[], stks: StickerPlacement[]) => {
        setEvents(evs);
        setStickers(stks);
        // If there are events and none are in current month, auto-focus to first event's month
        if (evs.length > 0) {
          const curY = currentDate.getFullYear();
          const curM = currentDate.getMonth();
          const curMonthPrefix = `${curY}-${String(curM + 1).padStart(2, '0')}`;
          const hasInCurMonth = evs.some((e) => e.date && e.date.startsWith(curMonthPrefix));
          if (!hasInCurMonth) {
            const firstDate = evs[0].date;
            if (firstDate) {
              const [y, m] = firstDate.split('-').map(Number);
              if (y && m) {
                setCurrentDate(new Date(y, m - 1, 1));
              }
            }
          }
        }
      };

      // 1. Immediately apply any pre-bundled payload so the calendar renders with zero wait
      if (sharedState) {
        applySharedData(sharedState.events || [], sharedState.stickers || []);
        if (sharedState.lastSyncedAt) {
          setLastSyncedAt(sharedState.lastSyncedAt);
          localStorage.setItem(STORAGE_LAST_SYNCED_KEY, sharedState.lastSyncedAt);
        }
      }

      // 2. If a Firebase owner UID is provided in the URL, load live updates from Firestore database snapshot with a 3.5s timeout
      if (calOwnerUid) {
        setIsSharedLoading(true);

        // Fetch owner profile (name & theme) with graceful catch
        getUserProfile(calOwnerUid)
          .then((profile) => {
            if (profile?.displayName) {
              setSharedOwnerName(profile.displayName);
            }
            if (profile?.themeId) {
              setTheme(getThemeById(profile.themeId));
            }
            if (profile?.lastSyncedAt && !lastSyncedAt) {
              setLastSyncedAt(profile.lastSyncedAt);
              localStorage.setItem(STORAGE_LAST_SYNCED_KEY, profile.lastSyncedAt);
            }
          })
          .catch((err) => console.warn('Could not fetch owner profile:', err));

        try {
          // Timeout promise: prevent getting stuck in an endless spinner if network/Firestore is latent
          const timeoutPromise = new Promise<{ isTimeout: true }>((resolve) =>
            setTimeout(() => resolve({ isTimeout: true }), 3500)
          );

          const fetchPromise = getCalendarSnapshot(calOwnerUid);
          const raceResult = await Promise.race([fetchPromise, timeoutPromise]);

          if ('isTimeout' in raceResult) {
            console.warn('Firestore live snapshot fetch timed out; using existing data');
            if (isManualRefresh) {
              const timeNotice = lastSyncedAt
                ? ` (ข้อมูล ณ ${formatLastUpdatedThai(lastSyncedAt)})`
                : '';
              showToast(`การเชื่อมต่อใช้เวลานาน ได้แสดงข้อมูลล่าสุดที่พร้อมใช้งาน${timeNotice}`);
            }
          } else if (raceResult) {
            const snapshot = raceResult;
            const finalEvents =
              snapshot.events && snapshot.events.length > 0
                ? snapshot.events
                : sharedState?.events && sharedState.events.length > 0
                ? sharedState.events
                : [];
            const finalStickers =
              snapshot.stickers && snapshot.stickers.length > 0
                ? snapshot.stickers
                : sharedState?.stickers && sharedState.stickers.length > 0
                ? sharedState.stickers
                : [];

            applySharedData(finalEvents, finalStickers);

            if (snapshot.lastSyncedAt) {
              setLastSyncedAt(snapshot.lastSyncedAt);
              localStorage.setItem(STORAGE_LAST_SYNCED_KEY, snapshot.lastSyncedAt);
            }
            if (snapshot.ownerName) {
              setSharedOwnerName(snapshot.ownerName);
            }
            if (snapshot.themeId) {
              setTheme(getThemeById(snapshot.themeId));
            }

            if (isManualRefresh) {
              const timeNotice = snapshot.lastSyncedAt
                ? ` (ข้อมูล ณ ${formatLastUpdatedThai(snapshot.lastSyncedAt)})`
                : '';
              showToast(
                `รีเฟรชข้อมูลปฏิทินของ ${name} สำเร็จ (พบนัดหมาย ${finalEvents.length} รายการ)${timeNotice}`
              );
            }
          }
        } catch (err) {
          console.warn('Refresh shared calendar error:', err);
          if (sharedState) {
            applySharedData(sharedState.events || [], sharedState.stickers || []);
          }
          if (isManualRefresh) {
            const timeNotice = lastSyncedAt
              ? ` (ข้อมูล ณ ${formatLastUpdatedThai(lastSyncedAt)})`
              : '';
            showToast(`รีเฟรชข้อมูลเรียบร้อย${timeNotice}`);
          }
        } finally {
          setIsSharedLoading(false);
        }

        setIsFirestoreConnected(true);
      } else if (sharedState) {
        if (isManualRefresh) {
          const timeNotice = sharedState.lastSyncedAt
            ? ` (ข้อมูล ณ ${formatLastUpdatedThai(sharedState.lastSyncedAt)})`
            : '';
          showToast(`รีเฟรชข้อมูลปฏิทินเรียบร้อย${timeNotice}`);
        }
      }
    },
    [currentDate, lastSyncedAt]
  );

  // Live real-time snapshot subscription for view-only mode
  useEffect(() => {
    const { isViewOnly: viewOnlyFromUrl, calOwnerUid } = checkIsViewOnlyFromUrl();
    if (!viewOnlyFromUrl || !calOwnerUid) return;

    const unsubscribe = subscribeToCalendarSnapshot(
      calOwnerUid,
      (snapshot) => {
        if (snapshot) {
          if (snapshot.events) setEvents(snapshot.events);
          if (snapshot.stickers) setStickers(snapshot.stickers);
          if (snapshot.lastSyncedAt) {
            setLastSyncedAt(snapshot.lastSyncedAt);
            localStorage.setItem(STORAGE_LAST_SYNCED_KEY, snapshot.lastSyncedAt);
          }
          if (snapshot.ownerName) setSharedOwnerName(snapshot.ownerName);
          if (snapshot.themeId) setTheme(getThemeById(snapshot.themeId));
        }
      },
      (err) => console.warn('Shared calendar real-time snapshot listener notice:', err)
    );

    return () => unsubscribe();
  }, []);

  // Safety fallback: ensure isSharedLoading is never stuck longer than 5 seconds under any circumstance
  useEffect(() => {
    if (isSharedLoading) {
      const timer = setTimeout(() => {
        setIsSharedLoading(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSharedLoading]);

  // 1. Initial Load: Check if opened via View-Only share link or load from local storage
  useEffect(() => {
    const { isViewOnly: viewOnlyFromUrl } = checkIsViewOnlyFromUrl();

    if (viewOnlyFromUrl) {
      loadSharedCalendarData(false);
      return;
    }

    // Normal mode: Load stored theme
    const savedThemeId = localStorage.getItem(STORAGE_THEME_KEY);
    if (savedThemeId) {
      setTheme(getThemeById(savedThemeId));
    }

    // Load stored stickers (start fresh, purge any old mock stickers)
    const savedStickers = localStorage.getItem(STORAGE_STICKERS_KEY);
    if (savedStickers) {
      try {
        const parsed = JSON.parse(savedStickers);
        if (Array.isArray(parsed)) {
          // Remove any previous sample mock stickers
          const realStickers = parsed.filter((s: any) => !s.id?.startsWith('st-'));
          setStickers(realStickers);
          localStorage.setItem(STORAGE_STICKERS_KEY, JSON.stringify(realStickers));
        } else {
          setStickers([]);
        }
      } catch (e) {
        console.error('Error parsing stickers:', e);
        setStickers([]);
      }
    } else {
      setStickers([]);
    }

    // Load stored events (start fresh, purge any old mock sample events)
    const savedEvents = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (savedEvents) {
      try {
        const parsed = JSON.parse(savedEvents);
        if (Array.isArray(parsed)) {
          // Remove any previous sample mock events
          const realEvents = parsed.filter((e: any) => !e.id?.startsWith('sample-'));
          setEvents(realEvents);
          localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(realEvents));
        } else {
          setEvents([]);
        }
      } catch (e) {
        console.error('Error parsing events:', e);
        setEvents([]);
      }
    } else {
      setEvents([]);
    }

    // Check for add_friend parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const addFriendUid = urlParams.get('add_friend');
    if (addFriendUid) {
      setInitialFriendSearchTerm(addFriendUid);
      setIsFriendsModalOpen(true);
      showToast('เปิดหน้าต่างเพิ่มเพื่อนจากลิงก์ที่ได้รับ');
      // Clean query parameter from URL without page reload
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Save changes locally if not in View-Only mode
  useEffect(() => {
    if (!isViewOnly) {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    }
  }, [events, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly) {
      localStorage.setItem(STORAGE_STICKERS_KEY, JSON.stringify(stickers));
    }
  }, [stickers, isViewOnly]);

  // Auth listener & Firestore live subscriptions
  useEffect(() => {
    if (isViewOnly) return;

    const unsubscribeAuth = initAuth(
      (authedUser, accessToken) => {
        setUser(authedUser);
        setIsFirestoreConnected(true);
        if (accessToken) {
          setToken(accessToken);
          setGcalConnected(true);
        } else {
          setToken(null);
          setGcalConnected(false);
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setGcalConnected(false);
        setIsFirestoreConnected(false);
      }
    );

    return () => unsubscribeAuth();
  }, [isViewOnly]);

  // When user is authenticated, sync with Firestore (Calendar-LA) in real-time
  useEffect(() => {
    if (!user || isViewOnly) return;

    // 0. Fetch initial database snapshot immediately so user sees existing data with zero latency
    getCalendarSnapshot(user.uid)
      .then((snapshot) => {
        if (snapshot) {
          if (snapshot.events && snapshot.events.length > 0) {
            setEvents((prev) => deduplicateEvents([...snapshot.events, ...prev]));
          }
          if (snapshot.stickers && snapshot.stickers.length > 0) {
            setStickers(snapshot.stickers);
          }
          if (snapshot.themeId) {
            setTheme(getThemeById(snapshot.themeId));
          }
          if (snapshot.lastSyncedAt) {
            setLastSyncedAt(snapshot.lastSyncedAt);
            localStorage.setItem(STORAGE_LAST_SYNCED_KEY, snapshot.lastSyncedAt);
          }
        }
      })
      .catch((err) => console.warn('Snapshot initial load error:', err));

    // 1. Update/Save user profile in Firestore
    saveUserProfile({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'ผู้ใช้งาน',
      photoURL: user.photoURL || '',
      themeId: theme.id,
      updatedAt: new Date().toISOString(),
    }).catch((e) => console.warn('User profile sync error:', e));

    // 2. Subscribe to user's events in Firestore
    const unsubscribeEvents = subscribeToEvents(
      user.uid,
      (cloudEvents) => {
        // Load user's existing events from Firestore and merge with any active Google Calendar events, removing duplicates
        setEvents((prev) => {
          const googleEvents = prev.filter((e) => e.isGoogleEvent);
          return deduplicateEvents([...cloudEvents, ...googleEvents]);
        });
      },
      (err) => console.warn('Firestore events listener:', err)
    );

    // 3. Subscribe to user's stickers in Firestore
    const unsubscribeStickers = subscribeToStickers(
      user.uid,
      (cloudStickers) => {
        setStickers(cloudStickers);
      },
      (err) => console.warn('Firestore stickers listener:', err)
    );

    // 4. Subscribe to user's friends in Firestore
    const unsubscribeFriends = subscribeToFriends(
      user.uid,
      (cloudFriends) => {
        setFriends(cloudFriends);
      },
      (err) => console.warn('Firestore friends listener:', err)
    );

    return () => {
      unsubscribeEvents();
      unsubscribeStickers();
      unsubscribeFriends();
    };
  }, [user, isViewOnly]);

  // Automatically fetch existing Google Calendar events whenever token is available or viewed month changes
  useEffect(() => {
    if (!token || isViewOnly) return;

    let isCancelled = false;
    const loadGCalEvents = async () => {
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const timeMin = new Date(year, month - 6, 1, 0, 0, 0).toISOString();
        const timeMax = new Date(year, month + 12, 0, 23, 59, 59).toISOString();

        const gEvents = await fetchGoogleCalendarEvents(token, timeMin, timeMax);
        if (!isCancelled) {
          setEvents((prev) => {
            const nonGoogle = prev.filter((e) => !e.isGoogleEvent);
            const combined = deduplicateEvents([...nonGoogle, ...gEvents]);
            if (user) {
              saveCalendarSnapshot(user.uid, {
                events: combined,
                stickers,
                themeId: theme.id,
                ownerName: calendarOwnerName !== 'My' ? calendarOwnerName : (user.displayName || 'เจ้าของปฏิทิน'),
              })
                .then((nowISO) => {
                  setLastSyncedAt(nowISO);
                  localStorage.setItem(STORAGE_LAST_SYNCED_KEY, nowISO);
                })
                .catch(console.warn);

              syncAllEventsToFirestore(user.uid, gEvents).catch(console.warn);
            }
            return combined;
          });
          setGcalConnected(true);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.warn('Google Calendar auto-fetch notice:', err);
          // On fetch failure, existing database-backed events remain displayed!
          if (
            err instanceof InsufficientScopeError ||
            err?.message?.includes('insufficient') ||
            err?.message?.includes('403') ||
            err?.message?.includes('401')
          ) {
            setToken(null);
            setGcalConnected(false);
            setAccessToken(null);
          }
        }
      }
    };

    loadGCalEvents();

    return () => {
      isCancelled = true;
    };
  }, [token, currentDate.getFullYear(), currentDate.getMonth(), isViewOnly, user]);

  // Subscribe to viewing friend's live events & stickers
  useEffect(() => {
    if (!viewingFriend) {
      setFriendEvents([]);
      setFriendStickers([]);
      return;
    }

    const unsubFriendEvents = subscribeToEvents(
      viewingFriend.friendUid,
      (evts) => {
        setFriendEvents(evts);
      },
      (err) => console.warn('Friend events listener:', err)
    );

    const unsubFriendStickers = subscribeToStickers(
      viewingFriend.friendUid,
      (stks) => {
        setFriendStickers(stks);
      },
      (err) => console.warn('Friend stickers listener:', err)
    );

    return () => {
      unsubFriendEvents();
      unsubFriendStickers();
    };
  }, [viewingFriend]);

  // Refresh friend's schedule manually
  const handleRefreshFriendSchedule = async () => {
    if (!viewingFriend) return;
    setIsRefreshingFriend(true);
    try {
      const [evts, stks] = await Promise.all([
        getSharedEvents(viewingFriend.friendUid),
        getSharedStickers(viewingFriend.friendUid),
      ]);
      setFriendEvents(evts);
      setFriendStickers(stks);
      showToast(`รีเฟรชตารางของ ${viewingFriend.displayName} สำเร็จ (พบนัดหมาย ${evts.length} รายการ)`);
    } catch (err) {
      console.warn('Refresh friend schedule error:', err);
      showToast('รีเฟรชข้อมูลไม่สำเร็จ โปรดลองอีกครั้ง');
    } finally {
      setIsRefreshingFriend(false);
    }
  };

  // Sync with Google Calendar (or connect if not yet authorized)
  const syncGoogleCalendar = useCallback(
    async (forceReconnect: boolean = false) => {
      let accessToken = !forceReconnect ? (token || getAccessToken()) : null;

      // If no valid access token or force reconnect, open Google authorization popup
      if (!accessToken) {
        setIsSyncingGCal(true);
        try {
          showToast('กำลังเปิดหน้าต่างขอสิทธิ์ Google Calendar...');
          const res = await requestGoogleCalendarAccess();
          if (res.user) {
            setUser(res.user);
            setIsFirestoreConnected(true);
          }

          if (res.hasCalendarAccess && res.accessToken) {
            accessToken = res.accessToken;
            setToken(res.accessToken);
            setGcalConnected(true);
            setAuthErrorModalOpen(false);
          } else {
            // User did not grant calendar permission or unchecked the box
            setIsScopeModalOpen(true);
            setScopeModalApiDisabled(false);
            setIsSyncingGCal(false);
            return;
          }
        } catch (authErr: any) {
          setIsSyncingGCal(false);
          if (
            authErr?.code === 'auth/popup-closed-by-user' ||
            authErr?.code === 'auth/cancelled-popup-request'
          ) {
            showToast('หน้าต่างขอสิทธิ์ถูกปิด โปรดลองใหม่อีกครั้ง');
            return;
          }
          const errorInfo = parseFirebaseAuthError(authErr);
          setAuthErrorInfo(errorInfo);
          setAuthErrorModalOpen(true);
          return;
        }
      }

      setIsSyncingGCal(true);
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const timeMin = new Date(year, month - 6, 1, 0, 0, 0).toISOString();
        const timeMax = new Date(year, month + 12, 0, 23, 59, 59).toISOString();

        const gEvents = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);

        let finalEvents: CalendarEvent[] = [];
        setEvents((prev) => {
          const nonGoogle = prev.filter((e) => !e.isGoogleEvent);
          finalEvents = deduplicateEvents([...nonGoogle, ...gEvents]);
          return finalEvents;
        });

        if (user) {
          const nowISO = await saveCalendarSnapshot(user.uid, {
            events: finalEvents.length > 0 ? finalEvents : gEvents,
            stickers,
            themeId: theme.id,
            ownerName: calendarOwnerName !== 'My' ? calendarOwnerName : (user.displayName || 'เจ้าของปฏิทิน'),
          });
          setLastSyncedAt(nowISO);
          localStorage.setItem(STORAGE_LAST_SYNCED_KEY, nowISO);
          syncAllEventsToFirestore(user.uid, gEvents).catch(console.warn);
        }

        setGcalConnected(true);
        const timeNotice = ` (อัปเดตล่าสุด: ${formatLastUpdatedThai(new Date().toISOString())})`;
        showToast(`ดึงข้อมูล Google Calendar และบันทึกลงฐานข้อมูลสำเร็จ (พบนัดหมาย ${gEvents.length} รายการ)${timeNotice}`);
      } catch (err: any) {
        console.warn('Google Calendar sync notice:', err);
        if (err instanceof ApiDisabledError) {
          setScopeModalApiDisabled(true);
          setScopeModalApiUrl(err.enableUrl);
          setIsScopeModalOpen(true);
        } else if (
          err instanceof InsufficientScopeError ||
          err?.message?.includes('insufficient') ||
          err?.message?.includes('403') ||
          err?.message?.includes('401')
        ) {
          setToken(null);
          setGcalConnected(false);
          setAccessToken(null);
          setScopeModalApiDisabled(false);
          setIsScopeModalOpen(true);
        } else {
          const fallbackMsg = lastSyncedAt
            ? `ไม่สามารถดึงข้อมูลใหม่จาก Google Calendar ได้ จึงแสดงข้อมูลล่าสุดจากฐานข้อมูล (ข้อมูล ณ ${formatLastUpdatedThai(lastSyncedAt)})`
            : 'ไม่สามารถดึงข้อมูลจาก Google Calendar ได้ แสดงข้อมูลเดิมที่มีอยู่ในฐานข้อมูล';
          showToast(fallbackMsg);
        }
      } finally {
        setIsSyncingGCal(false);
      }
    },
    [token, currentDate, user, stickers, theme.id, calendarOwnerName, lastSyncedAt]
  );

  // Handle Google Login
  const handleGoogleLogin = async (includeCalendarScope: boolean = true) => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn(includeCalendarScope);
      if (res) {
        setUser(res.user);
        setIsFirestoreConnected(true);

        if (res.hasCalendarAccess && res.accessToken) {
          setToken(res.accessToken);
          setGcalConnected(true);
          showToast(`เข้าสู่ระบบ Google สำเร็จ: ${res.user.displayName || res.user.email}`);

          // Automatically sync Google Calendar events after login
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const timeMin = new Date(year, month - 6, 1, 0, 0, 0).toISOString();
          const timeMax = new Date(year, month + 12, 0, 23, 59, 59).toISOString();

          try {
            const gEvents = await fetchGoogleCalendarEvents(res.accessToken, timeMin, timeMax);
            if (gEvents.length > 0) {
              setEvents((prev) => {
                const nonGoogle = prev.filter((e) => !e.isGoogleEvent);
                return deduplicateEvents([...nonGoogle, ...gEvents]);
              });
              syncAllEventsToFirestore(res.user.uid, gEvents).catch(console.warn);
              showToast(`เชื่อมต่อ Google Calendar สำเร็จ (นำเข้า ${gEvents.length} นัดหมาย)`);
            }
          } catch (gcalErr: any) {
            console.warn('Initial Google Calendar fetch notice:', gcalErr);
            if (gcalErr instanceof ApiDisabledError) {
              setScopeModalApiDisabled(true);
              setScopeModalApiUrl(gcalErr.enableUrl);
              setIsScopeModalOpen(true);
            } else if (
              gcalErr instanceof InsufficientScopeError ||
              gcalErr?.message?.includes('insufficient') ||
              gcalErr?.message?.includes('403')
            ) {
              setToken(null);
              setGcalConnected(false);
              setAccessToken(null);
              setScopeModalApiDisabled(false);
              setIsScopeModalOpen(true);
            }
          }
        } else {
          setToken(null);
          setGcalConnected(false);
          showToast(`เข้าสู่ระบบสำเร็จ: ${res.user.displayName || res.user.email}`);
          if (includeCalendarScope && !res.hasCalendarAccess) {
            setIsScopeModalOpen(true);
            setScopeModalApiDisabled(false);
          }
        }

        // Successfully signed in - dismiss troubleshooting modal
        setAuthErrorModalOpen(false);
        setAuthErrorInfo(null);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        console.info('Login notice: popup closed by user');
      } else if (err?.code === 'auth/popup-blocked') {
        console.warn('Login notice: popup blocked by browser');
      } else {
        console.error('Login error:', err);
      }

      const parsed = parseFirebaseAuthError(err);
      setAuthErrorInfo(parsed);
      setAuthErrorModalOpen(true);
      if (parsed.code === 'auth/popup-closed-by-user' || parsed.code === 'auth/cancelled-popup-request') {
        showToast('หน้าต่างเข้าสู่ระบบถูกปิด โปรดลองใหม่อีกครั้ง');
      } else if (parsed.code === 'auth/popup-blocked') {
        showToast('เบราว์เซอร์บล็อกหน้าต่างเข้าสู่ระบบ โปรดอนุญาตป๊อปอัปหรือเปิดในแท็บใหม่');
      } else {
        showToast(`เข้าสู่ระบบไม่สำเร็จ: ${parsed.title}`);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
      setGcalConnected(false);
      setIsFirestoreConnected(false);
      setEvents([]);
      setStickers([]);
      setFriends([]);
      localStorage.removeItem(STORAGE_EVENTS_KEY);
      localStorage.removeItem(STORAGE_STICKERS_KEY);
      showToast('ออกจากระบบเรียบร้อยแล้ว (รีเซ็ตข้อมูลเริ่มต้นใหม่)');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Month Navigation
  const prevMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date(2026, 8, 12);
    setCurrentDate(today);
    setSelectedDateKey(formatDateKey(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  // Add / Edit Event Handler (Owner only)
  const handleOpenAddEvent = (dateKey: string, slot: TimeSlot = 'morning') => {
    if (isViewOnly) return;
    if (viewingFriend) {
      showToast('คุณกำลังดูตารางของเพื่อน (กรุณากด "กลับไปตารางของฉัน" เพื่อเพิ่มนัดหมาย)');
      return;
    }
    setEditingEvent(null);
    setAddModalDate(dateKey);
    setAddModalSlot(slot);
    setAddModalOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    if (isViewOnly) return;
    if (viewingFriend) {
      showToast('คุณกำลังดูตารางของเพื่อน ไม่สามารถแก้ไขนัดหมายได้');
      return;
    }
    setEditingEvent(event);
    setAddModalDate(event.date);
    setAddModalSlot(event.slot);
    setDetailModalOpen(false);
    setSelectedEvent(null);
    setSlotListModalOpen(false);
    setAddModalOpen(true);
  };

  // Helper to persist snapshot to Firestore database
  const persistSnapshot = useCallback(
    async (evts: CalendarEvent[], stks: StickerPlacement[], customThemeId?: string) => {
      if (!user || isViewOnly) return;
      try {
        const nowISO = await saveCalendarSnapshot(user.uid, {
          events: evts,
          stickers: stks,
          themeId: customThemeId || theme.id,
          ownerName:
            calendarOwnerName !== 'My'
              ? calendarOwnerName
              : user.displayName || 'เจ้าของปฏิทิน',
        });
        setLastSyncedAt(nowISO);
        localStorage.setItem(STORAGE_LAST_SYNCED_KEY, nowISO);
      } catch (err) {
        console.warn('persistSnapshot notice:', err);
      }
    },
    [user, isViewOnly, theme.id, calendarOwnerName]
  );

  const handleUpdateEvent = async (
    eventId: string,
    eventData: Partial<CalendarEvent>,
    syncToGoogle: boolean
  ) => {
    if (isViewOnly || viewingFriend) return;

    const existing = events.find((e) => e.id === eventId);
    if (!existing) return;

    let googleEventId = existing.googleEventId;

    if (token && (existing.googleEventId || syncToGoogle)) {
      try {
        if (existing.googleEventId) {
          await updateGoogleCalendarEvent(token, existing.googleEventId, {
            title: eventData.title || existing.title,
            description:
              eventData.description !== undefined
                ? eventData.description
                : existing.description,
            location:
              eventData.location !== undefined
                ? eventData.location
                : existing.location,
            date: eventData.date || existing.date,
            startTime: eventData.startTime || existing.startTime,
            endTime: eventData.endTime || existing.endTime,
          });
        } else if (syncToGoogle) {
          googleEventId = await createGoogleCalendarEvent(token, {
            title: eventData.title || existing.title,
            description:
              eventData.description !== undefined
                ? eventData.description
                : existing.description,
            location:
              eventData.location !== undefined
                ? eventData.location
                : existing.location,
            date: eventData.date || existing.date,
            startTime: eventData.startTime || existing.startTime,
            endTime: eventData.endTime || existing.endTime,
          });
        }
      } catch (err: any) {
        if (
          err instanceof InsufficientScopeError ||
          err?.message?.includes('insufficient') ||
          err?.message?.includes('403') ||
          err?.message?.includes('401')
        ) {
          console.warn('Google Calendar scope insufficient during update:', err);
          setToken(null);
          setGcalConnected(false);
          setAccessToken(null);
          showToast('อัปเดตในแอพแล้ว (สิทธิ์ Google Calendar ไม่เพียงพอ โปรดเชื่อมต่อใหม่)');
        } else {
          console.error('Failed to update in Google Calendar:', err);
          showToast('อัปเดตในระบบแล้ว แต่ซิงค์ Google Calendar ไม่สำเร็จ');
        }
      }
    }

    const updatedEvent: CalendarEvent = {
      ...existing,
      ...eventData,
      id: eventId,
      googleEventId: googleEventId || existing.googleEventId,
      isGoogleEvent: !!(googleEventId || existing.googleEventId),
    };

    const nextEvents = deduplicateEvents(events.map((e) => (e.id === eventId ? updatedEvent : e)));
    setEvents(nextEvents);
    persistSnapshot(nextEvents, stickers);

    // Save to Firestore Calendar-LA if user is signed in
    if (user) {
      saveEventToFirestore(user.uid, updatedEvent).catch((err) => {
        console.error('Firestore save error:', err);
      });
    }

    showToast(`อัปเดตนัดหมาย "${updatedEvent.title}" เรียบร้อยแล้ว`);
  };

  const handleSaveEvent = async (
    eventData: Omit<CalendarEvent, 'id'>,
    syncToGoogle: boolean
  ) => {
    if (isViewOnly || viewingFriend) return;

    let googleEventId: string | undefined;

    if (syncToGoogle && token) {
      try {
        googleEventId = await createGoogleCalendarEvent(token, {
          title: eventData.title,
          description: eventData.description,
          location: eventData.location,
          date: eventData.date,
          startTime: eventData.startTime,
          endTime: eventData.endTime,
        });
      } catch (err: any) {
        if (
          err instanceof InsufficientScopeError ||
          err?.message?.includes('insufficient') ||
          err?.message?.includes('403') ||
          err?.message?.includes('401')
        ) {
          console.warn('Google Calendar scope insufficient during create:', err);
          setToken(null);
          setGcalConnected(false);
          setAccessToken(null);
          showToast('บันทึกในแอพแล้ว (สิทธิ์ Google Calendar ไม่เพียงพอ โปรดเชื่อมต่อใหม่)');
        } else {
          console.error('Failed to create in Google Calendar:', err);
          showToast('บันทึกในแอพแล้ว แต่ซิงค์ Google Calendar ไม่สำเร็จ');
        }
      }
    }

    const newEvent: CalendarEvent = {
      ...eventData,
      id: googleEventId ? `gcal-${googleEventId}` : `evt-${Date.now()}`,
      googleEventId,
      isGoogleEvent: !!googleEventId,
    };

    const nextEvents = deduplicateEvents([...events, newEvent]);
    setEvents(nextEvents);
    persistSnapshot(nextEvents, stickers);

    // Save to Firestore Calendar-LA if user is signed in
    if (user) {
      saveEventToFirestore(user.uid, newEvent).catch((err) => {
        console.error('Firestore save error:', err);
      });
    }

    showToast(
      googleEventId
        ? 'ลงนัดหมายและซิงค์ไปยัง Google Calendar เรียบร้อยแล้ว!'
        : 'ลงนัดหมายในปฏิทินเรียบร้อยแล้ว'
    );
  };

  // Delete Event Handler (Owner only)
  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (isViewOnly || viewingFriend) return;

    if (event.isGoogleEvent && event.googleEventId && token) {
      try {
        await deleteGoogleCalendarEvent(token, event.googleEventId);
      } catch (err: any) {
        if (
          err instanceof InsufficientScopeError ||
          err?.message?.includes('insufficient') ||
          err?.message?.includes('403') ||
          err?.message?.includes('401')
        ) {
          console.warn('Google Calendar scope insufficient during delete:', err);
          setToken(null);
          setGcalConnected(false);
          setAccessToken(null);
        } else {
          console.error('Failed to delete from Google Calendar:', err);
        }
      }
    }

    const nextEvents = events.filter((e) => e.id !== event.id);
    setEvents(nextEvents);
    persistSnapshot(nextEvents, stickers);

    // Delete from Firestore Calendar-LA if user is signed in
    if (user) {
      deleteEventFromFirestore(user.uid, event.id).catch((err) => {
        console.error('Firestore delete error:', err);
      });
    }

    showToast(`ลบนัดหมาย "${event.title}" เรียบร้อยแล้ว`);
  };

  // Stickers Handlers (Owner only)
  const handleOpenStickerPicker = (dateKey: string, slot?: TimeSlot) => {
    if (isViewOnly) return;
    if (viewingFriend) {
      showToast('คุณกำลังดูตารางของเพื่อน (โหมดดูอย่างเดียว)');
      return;
    }
    setStickerModalDate(dateKey);
    setStickerModalSlot(slot);
    setStickerModalOpen(true);
  };

  const handleAddSticker = (
    emoji: string,
    name: string,
    dateKey: string,
    slot?: TimeSlot
  ) => {
    if (isViewOnly || viewingFriend) return;

    const newSticker: StickerPlacement = {
      id: `stk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      date: dateKey,
      slot,
      emoji,
      name,
      createdAt: Date.now(),
    };

    const nextStickers = [...stickers, newSticker];
    setStickers(nextStickers);
    persistSnapshot(events, nextStickers);

    // Save to Firestore Calendar-LA if user is signed in
    if (user) {
      saveStickerToFirestore(user.uid, newSticker).catch((err) => {
        console.error('Firestore sticker save error:', err);
      });
    }

    showToast(`แปะสติ๊กเกอร์ ${emoji} แล้ว`);
  };

  const handleRemoveSticker = (stickerId: string) => {
    if (isViewOnly || viewingFriend) return;

    const nextStickers = stickers.filter((s) => s.id !== stickerId);
    setStickers(nextStickers);
    persistSnapshot(events, nextStickers);

    // Delete from Firestore Calendar-LA if user is signed in
    if (user) {
      deleteStickerFromFirestore(user.uid, stickerId).catch((err) => {
        console.error('Firestore sticker delete error:', err);
      });
    }
  };

  // Slot Click Handler: when clicking an empty slot, directly open Add Event modal
  const handleSlotClick = (dateKey: string, slot: TimeSlot, slotEvents: CalendarEvent[]) => {
    setSelectedDateKey(dateKey);
    if (!isEffectiveViewOnly && slotEvents.length === 0) {
      // Directly open Add Event modal for the clicked empty slot
      handleOpenAddEvent(dateKey, slot);
      return;
    }
    setSlotListDate(dateKey);
    setSlotListSlot(slot);
    setSlotListEvents(slotEvents);
    setSlotListModalOpen(true);
  };

  // Save custom owner name
  const handleSaveOwnerName = () => {
    const trimmed = tempOwnerName.trim();
    if (trimmed) {
      setCustomOwnerName(trimmed);
      localStorage.setItem(STORAGE_OWNER_NAME_KEY, trimmed);
      if (user) {
        saveUserProfile({
          uid: user.uid,
          email: user.email || '',
          displayName: trimmed,
          photoURL: user.photoURL || '',
          themeId: theme.id,
          updatedAt: new Date().toISOString(),
        }).catch((e) => console.warn('User profile sync error:', e));
      }
      showToast(`เปลี่ยนชื่อหัวปฏิทินเป็น "${trimmed} Calendar" เรียบร้อยแล้ว`);
    }
    setIsEditingOwnerName(false);
  };

  // Share Handler (generates read-only link for friends)
  const handleOpenShareModal = async () => {
    let syncedAtIso = lastSyncedAt;

    // If user is logged in, sync all current events to Firestore snapshot right before sharing
    if (user) {
      try {
        const nowISO = await saveCalendarSnapshot(user.uid, {
          events,
          stickers,
          themeId: theme.id,
          ownerName:
            calendarOwnerName !== 'My'
              ? calendarOwnerName
              : user.displayName || 'เจ้าของปฏิทิน',
        });
        syncedAtIso = nowISO;
        setLastSyncedAt(nowISO);
        localStorage.setItem(STORAGE_LAST_SYNCED_KEY, nowISO);
      } catch (e) {
        console.warn('Snapshot pre-share save error:', e);
      }

      saveUserProfile({
        uid: user.uid,
        email: user.email || '',
        displayName: calendarOwnerName !== 'My' ? calendarOwnerName : (user.displayName || 'เจ้าของปฏิทิน'),
        themeId: theme.id,
        updatedAt: new Date().toISOString(),
      }).catch(console.warn);

      syncAllEventsToFirestore(user.uid, events).catch(console.warn);
      syncAllStickersToFirestore(user.uid, stickers).catch(console.warn);
    }

    const url = generateShareUrl(
      events,
      stickers,
      theme.id,
      calendarOwnerName !== 'My' ? calendarOwnerName : (user?.displayName || 'เจ้าของปฏิทิน'),
      user?.uid,
      syncedAtIso || new Date().toISOString()
    );
    setShareUrl(url);
    setIsShareModalOpen(true);
  };

  // Theme Change (Multiple themes)
  const handleSelectTheme = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
    if (!isViewOnly) {
      localStorage.setItem(STORAGE_THEME_KEY, newTheme.id);
      persistSnapshot(events, stickers, newTheme.id);
      if (user) {
        saveUserProfile({
          uid: user.uid,
          email: user.email || '',
          themeId: newTheme.id,
          updatedAt: new Date().toISOString(),
        }).catch(console.warn);
      }
    }
    showToast(`เปลี่ยนธีมเป็น "${newTheme.nameTh}" แล้ว`);
  };

  // Month grid
  const daysGrid = getCalendarGrid(currentDate.getFullYear(), currentDate.getMonth());

  // Effective state for viewing friend vs own
  const isEffectiveViewOnly = isViewOnly || !!viewingFriend;
  const displayedEvents = viewingFriend ? friendEvents : events;
  const displayedStickers = viewingFriend ? friendStickers : stickers;

  return (
    <div
      id="slot-calendar-app"
      className={`min-h-screen flex flex-col transition-colors duration-200 ${theme.appBg} ${theme.textColor}`}
    >
      {/* 1. View-Only Mode Banner (For friends viewing the shared link) */}
      {isViewOnly && (
        <aside
          aria-label="Shared calendar notice"
          id="view-only-banner"
          className="bg-stone-900 text-white px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-3 border-b border-stone-800 shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate">
                <span className="font-bold text-amber-300">
                  โหมดดูอย่างเดียว (Read-Only):
                </span>{' '}
                <span className="text-stone-200">
                  คุณกำลังดูปฏิทินของ <strong>{sharedOwnerName}</strong> (ไม่สามารถแก้ไขหรือลบได้)
                </span>
              </div>
              {lastSyncedAt && (
                <div className="flex items-center gap-1 text-[11px] text-amber-300/90 mt-0.5 font-medium">
                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>ข้อมูลล่าสุดในฐานข้อมูล ณ: {formatLastUpdatedThai(lastSyncedAt)}</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="refresh-shared-banner-btn"
              onClick={() => loadSharedCalendarData(true)}
              disabled={isSharedLoading}
              title="รีเฟรชเพื่อดึงข้อมูลนัดหมายล่าสุดของเพื่อนจากฐานข้อมูล"
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition-all text-xs shrink-0 shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSharedLoading ? 'animate-spin' : ''}`} />
              <span>{isSharedLoading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = window.location.origin + window.location.pathname;
              }}
              className="px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 text-white font-medium transition-colors text-xs shrink-0 border border-white/20"
            >
              ไปยังปฏิทินของฉัน
            </button>
          </div>
        </aside>
      )}

      {/* Loading state for shared calendar */}
      {isViewOnly && isSharedLoading && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2 font-medium">
          <div className="w-3.5 h-3.5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
          <span>
            กำลังเชื่อมต่อฐานข้อมูลเพื่อดึงข้อมูลปฏิทินล่าสุดของ {sharedOwnerName}...
            {lastSyncedAt ? ' (กำลังแสดงข้อมูล ณ ' + formatLastUpdatedThai(lastSyncedAt) + ')' : ''}
          </span>
        </div>
      )}

      {/* Main Header (Clean, responsive non-overlapping layout) */}
      <header
        id="app-header"
        className={`sticky top-0 z-30 border-b px-3 sm:px-4 py-2.5 shadow-2xs ${theme.headerBg} ${theme.cardBorder}`}
      >
        <div className="max-w-4xl mx-auto flex flex-col gap-2">
          {/* Top Bar: Title & Core Actions */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 gap-x-2">
            {/* Logo and Name */}
            <div className="flex items-center gap-2 shrink-0">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-2xs shrink-0"
                style={{ backgroundColor: theme.accentColor || '#1c1917' }}
              >
                <CalendarIcon className="w-4 h-4 text-white" />
              </div>

              {isEditingOwnerName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSaveOwnerName();
                  }}
                  className="flex items-center gap-1 min-w-0"
                >
                  <input
                    type="text"
                    value={tempOwnerName}
                    onChange={(e) => setTempOwnerName(e.target.value)}
                    placeholder="ชื่อของคุณ"
                    autoFocus
                    className="px-2 py-0.5 text-xs sm:text-sm font-bold border border-amber-400 rounded-lg bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 outline-none w-28 sm:w-36 focus:ring-2 focus:ring-amber-500 shadow-2xs"
                  />
                  <button
                    type="submit"
                    className="p-1 rounded-md bg-amber-500 text-white hover:bg-amber-600 transition-colors cursor-pointer"
                    title="บันทึกชื่อ"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingOwnerName(false)}
                    className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors cursor-pointer"
                    title="ยกเลิก"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1 group min-w-0 max-w-[150px] xs:max-w-[200px] sm:max-w-none">
                  <h1
                    id="calendar-header-title"
                    className="font-bold text-xs sm:text-sm md:text-base tracking-tight truncate text-stone-900 dark:text-stone-100"
                    title={calendarHeaderTitle}
                  >
                    <span className="text-stone-900 dark:text-stone-100">{calendarOwnerName}</span>{' '}
                    <span className="text-amber-600 dark:text-amber-500 font-semibold">Calendar</span>
                  </h1>

                  {!isEffectiveViewOnly && (
                    <button
                      type="button"
                      onClick={() => {
                        setTempOwnerName(customOwnerName || user?.displayName || (calendarOwnerName === 'My' ? '' : calendarOwnerName));
                        setIsEditingOwnerName(true);
                      }}
                      title="แก้ไขชื่อเจ้าของตาราง"
                      className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}

              {/* Firebase Cloud Status Badge */}
              {user && (
                <span
                  title="ข้อมูลบันทึกในฐานข้อมูล Firebase (Calendar-LA)"
                  className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 flex items-center gap-1 shrink-0"
                >
                  <Cloud className="w-2.5 h-2.5 text-emerald-600" />
                  <span className="hidden xs:inline">Calendar-LA</span>
                </span>
              )}
            </div>

            {/* Top Action Buttons (Themes, Share, Friends, Refresh Google, Google Login / Sync, Add Event) */}
            <div className="flex flex-wrap items-center justify-end gap-1.5 min-w-0">
              {/* Theme Selector Button */}
              <button
                type="button"
                id="theme-selector-btn"
                onClick={() => setIsThemeOpen(true)}
                title="เปลี่ยนธีมสี (มี 8 รูปแบบ)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Palette className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                <span className="hidden xs:inline sm:inline">ธีมสี</span>
              </button>

              {/* Share View-Only Button */}
              <button
                type="button"
                id="share-calendar-btn"
                onClick={handleOpenShareModal}
                title="แชร์ให้เพื่อนดู (โหมดดูอย่างเดียว)"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Share2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="hidden xs:inline sm:inline">แชร์</span>
              </button>

              {/* Friends & Schedule Sharing Button */}
              <button
                type="button"
                id="friends-btn"
                onClick={() => setIsFriendsModalOpen(true)}
                title="จัดการเพื่อนและดูตารางเพื่อน"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
                  viewingFriend
                    ? 'bg-emerald-600 border-emerald-700 text-white'
                    : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                }`}
              >
                <Users className={`w-3.5 h-3.5 shrink-0 ${viewingFriend ? 'text-white' : 'text-emerald-600'}`} />
                <span>เพื่อน</span>
                {friends.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      viewingFriend ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {friends.length}
                  </span>
                )}
              </button>

              {/* Google Calendar Controls when in normal mode, or Refresh Shared Calendar button when in view-only mode */}
              {!isViewOnly ? (
                <>
                  {user ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Logged in: Displays "รีเฟรช" if active, or "เชื่อมต่อ Calendar" if not yet authorized */}
                      {gcalConnected && (token || getAccessToken()) ? (
                        <button
                          type="button"
                          id="refresh-gcal-btn"
                          onClick={() => syncGoogleCalendar(false)}
                          disabled={isSyncingGCal}
                          title="รีเฟรชเพื่ออัปเดตนัดหมายจาก Google Calendar ล่าสุด"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50/90 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 text-blue-600 shrink-0 ${
                              isSyncingGCal ? 'animate-spin' : ''
                            }`}
                          />
                          <span>{isSyncingGCal ? 'กำลังอัปเดต...' : 'รีเฟรช'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          id="connect-gcal-btn"
                          onClick={() => syncGoogleCalendar(true)}
                          disabled={isSyncingGCal}
                          title="คลิกเพื่อเชื่อมต่อและดึงข้อมูลจาก Google Calendar"
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer shrink-0 whitespace-nowrap"
                        >
                          <CalendarIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{isSyncingGCal ? 'กำลังเชื่อม...' : 'ดึง Google Cal'}</span>
                        </button>
                      )}
                      {/* User Profile Avatar Pill */}
                      <div
                        className="flex items-center gap-1 px-2 py-1 rounded-xl bg-stone-100 border border-stone-200/80 text-xs font-medium text-stone-700 max-w-[120px] shrink-0"
                        title={`เข้าสู่ระบบโดย ${user.displayName || user.email}`}
                      >
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt=""
                            className="w-4 h-4 rounded-full shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-stone-500 shrink-0" />
                        )}
                        <span className="truncate hidden md:inline text-[11px]">
                          {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                        </span>
                      </div>

                      {/* Logout */}
                      <button
                        type="button"
                        id="google-logout-btn"
                        onClick={handleGoogleLogout}
                        title={`ออกจากระบบ (${user.displayName || 'Google'})`}
                        className="p-1.5 rounded-xl border border-stone-200 bg-white hover:bg-rose-50 text-stone-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        id="google-signin-btn"
                        onClick={() => handleGoogleLogin(true)}
                        disabled={isSigningIn}
                        title="เข้าสู่ระบบด้วย Google และเชื่อมต่อ Google Calendar ของตนเอง"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 text-xs font-medium shadow-2xs transition-colors cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 48 48">
                          <path
                            fill="#EA4335"
                            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                          />
                          <path
                            fill="#4285F4"
                            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                          />
                          <path
                            fill="#34A853"
                            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                          />
                        </svg>
                        <span>{isSigningIn ? 'กำลังเชื่อมต่อ...' : 'Google'}</span>
                      </button>

                      {/* If in iframe, provide a direct Open-in-new-tab button to bypass iframe cookie/popup blocks */}
                      {typeof window !== 'undefined' && window.self !== window.top && (
                        <button
                          type="button"
                          id="open-in-new-tab-btn"
                          onClick={() => window.open(window.location.href, '_blank')}
                          title="เปิดในแท็บใหม่ (แนะนำสำหรับการเข้าสู่ระบบ Google เพื่อไม่ให้เบราว์เซอร์บล็อกป๊อปอัป)"
                          className="p-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Primary Add Event Button with Theme-aware styling (Hidden when viewing friend) */}
                  {!isEffectiveViewOnly && (
                    <button
                      type="button"
                      id="header-add-event-btn"
                      onClick={() => handleOpenAddEvent(selectedDateKey)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition-all cursor-pointer shrink-0 whitespace-nowrap ${theme.primaryBtn}`}
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span>ลงนัด</span>
                    </button>
                  )}
                </>
              ) : (
                /* Prominent Header Refresh Button for Friend in View-Only Mode */
                <button
                  type="button"
                  id="refresh-shared-header-btn"
                  onClick={() => loadSharedCalendarData(true)}
                  disabled={isSharedLoading}
                  title="รีเฟรชเพื่อดึงข้อมูลนัดหมายล่าสุดของเพื่อน"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer shrink-0 whitespace-nowrap disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-amber-700 shrink-0 ${
                      isSharedLoading ? 'animate-spin' : ''
                    }`}
                  />
                  <span>{isSharedLoading ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Sub Row: Month Selector + View Mode */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
            {/* Month Nav */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                title="เดือนก่อนหน้า"
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs sm:text-sm font-bold text-stone-800 px-1">
                {THAI_MONTHS[currentDate.getMonth()]}{' '}
                {formatYearThai(currentDate.getFullYear())}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                title="เดือนถัดไป"
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={goToToday}
                className="ml-1 px-2 py-0.5 text-[11px] font-semibold rounded-md border border-stone-200 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
              >
                วันนี้
              </button>

              {lastSyncedAt && (
                <div
                  title={`ข้อมูลในฐานข้อมูล ณ: ${formatLastUpdatedThai(lastSyncedAt)}`}
                  className="hidden md:flex items-center gap-1.5 ml-2 px-2.5 py-0.5 rounded-full bg-stone-100/90 dark:bg-stone-800 text-[11px] text-stone-600 dark:text-stone-300 font-medium border border-stone-200/80 dark:border-stone-700/80 shrink-0"
                >
                  <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>ข้อมูลล่าสุด: {formatLastUpdatedThai(lastSyncedAt)}</span>
                </div>
              )}
            </div>

            {/* View Mode Switcher (Month / Week) */}
            <div className="flex p-0.5 rounded-lg bg-stone-100 border border-stone-200/80">
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'month'
                    ? 'bg-white shadow-2xs text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                เดือน
              </button>
              <button
                type="button"
                onClick={() => setViewMode('week')}
                className={`px-2.5 py-0.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  viewMode === 'week'
                    ? 'bg-white shadow-2xs text-stone-900 font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                สัปดาห์
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. Viewing Friend's Schedule Banner */}
      {viewingFriend && (
        <aside
          aria-label="Friend schedule view banner"
          id="viewing-friend-banner"
          className="bg-emerald-700 text-white px-3.5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border-b border-emerald-800 shadow-sm"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-800 border border-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 text-white">
              {viewingFriend.photoURL ? (
                <img
                  src={viewingFriend.photoURL}
                  alt={viewingFriend.displayName}
                  referrerPolicy="no-referrer"
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (viewingFriend.displayName || viewingFriend.email || 'F')[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-bold truncate">
                  กำลังดูตารางของ: {viewingFriend.displayName}
                </span>
                <span className="text-[10px] bg-emerald-900/80 px-2 py-0.5 rounded-full border border-emerald-500/40 shrink-0 font-medium">
                  โหมดดูเท่านั้น
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/90 truncate">{viewingFriend.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              id="refresh-friend-schedule-btn"
              onClick={handleRefreshFriendSchedule}
              disabled={isRefreshingFriend}
              title="รีเฟรชเพื่อดึงข้อมูลตารางล่าสุดของเพื่อน"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 border border-emerald-500/50 cursor-pointer disabled:opacity-50 active:scale-95 shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-200 ${isRefreshingFriend ? 'animate-spin' : ''}`} />
              <span>{isRefreshingFriend ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
            </button>
            <button
              type="button"
              onClick={() => setComparingFriend(viewingFriend)}
              className="px-3 py-1.5 rounded-xl bg-white text-emerald-950 hover:bg-emerald-50 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>เทียบเวลาว่าง</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewingFriend(null);
                showToast('กลับสู่ตารางปฏิทินของฉัน');
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-900 hover:bg-black text-white font-medium text-xs transition-colors border border-emerald-600/50 cursor-pointer"
            >
              กลับไปตารางของฉัน
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area (Max width 4xl for optimal vertical mobile reading) */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2.5 sm:p-4 space-y-2.5">
        {/* Prompt banner to connect Google Calendar if signed in but calendar scope not yet active */}
        {user && !isViewOnly && !viewingFriend && !(gcalConnected && (token || getAccessToken())) && (
          <aside
            aria-label="Google Calendar connect prompt"
            id="gcal-connect-prompt-banner"
            className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs shadow-2xs animate-in fade-in"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0">
                <CalendarIcon className="w-4 h-4" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <p className="font-bold text-xs text-amber-950 dark:text-amber-100">
                  ต้องการดึงนัดหมายจาก Google Calendar ของคุณหรือไม่?
                </p>
                <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-tight">
                  เชื่อมต่อเพื่อให้ระบบดึงนัดหมายเดิม และซิงค์รายการใหม่เข้า Google Calendar อัตโนมัติ
                </p>
              </div>
            </div>
            <button
              type="button"
              id="banner-connect-gcal-btn"
              onClick={() => syncGoogleCalendar(true)}
              disabled={isSyncingGCal}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors shadow-2xs cursor-pointer shrink-0 ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingGCal ? 'animate-spin' : ''}`} />
              <span>{isSyncingGCal ? 'กำลังเปิดหน้าต่าง...' : 'เชื่อมต่อ Google Calendar'}</span>
            </button>
          </aside>
        )}

        {/* Calendar View (Month or Week) */}
        <div
          className={`rounded-2xl border p-2 sm:p-3 shadow-xs ${theme.cardBg} ${theme.cardBorder}`}
        >
          {viewMode === 'month' ? (
            <MonthView
              days={daysGrid}
              theme={theme}
              events={displayedEvents}
              stickers={displayedStickers}
              isViewOnly={isEffectiveViewOnly}
              selectedDateKey={selectedDateKey}
              onDaySelect={(key) => setSelectedDateKey(key)}
              onSlotClick={handleSlotClick}
              onAddEvent={handleOpenAddEvent}
              onOpenStickers={handleOpenStickerPicker}
              onEventClick={(ev) => {
                setSelectedEvent(ev);
                setDetailModalOpen(true);
              }}
              onRemoveSticker={handleRemoveSticker}
            />
          ) : (
            <WeekView
              currentDate={currentDate}
              theme={theme}
              events={displayedEvents}
              stickers={displayedStickers}
              isViewOnly={isEffectiveViewOnly}
              onSlotClick={handleSlotClick}
              onAddEvent={handleOpenAddEvent}
              onOpenStickers={handleOpenStickerPicker}
              onEventClick={(ev) => {
                setSelectedEvent(ev);
                setDetailModalOpen(true);
              }}
            />
          )}
        </div>

        {/* Mobile Vertical Day Schedule Card (Selected Day Planner) */}
        {viewMode === 'month' && (
          <DayScheduleCard
            dateKey={selectedDateKey}
            theme={theme}
            events={displayedEvents}
            stickers={displayedStickers}
            isViewOnly={isEffectiveViewOnly}
            onAddEvent={handleOpenAddEvent}
            onEventClick={(ev) => {
              setSelectedEvent(ev);
              setDetailModalOpen(true);
            }}
            onOpenStickers={handleOpenStickerPicker}
          />
        )}
      </main>

      {/* Floating Action Button (Add Event) at bottom-right (Owner only, hidden in friend view) */}
      {!isEffectiveViewOnly && (
        <button
          type="button"
          id="floating-add-event-btn"
          onClick={() => handleOpenAddEvent(selectedDateKey)}
          aria-label="เพิ่มกำหนดการ"
          className={`fixed bottom-5 right-4 sm:bottom-7 sm:right-7 z-40 flex items-center gap-2 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full shadow-lg hover:shadow-xl active:scale-95 transition-all text-xs sm:text-sm font-bold cursor-pointer ${theme.primaryBtn}`}
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
          <span>เพิ่มกำหนดการ</span>
        </button>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <aside
          aria-label="Notification toast"
          className="fixed bottom-20 right-4 sm:bottom-24 sm:right-7 z-50 animate-in slide-in-from-bottom-3 duration-200 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-stone-900 text-white text-xs shadow-xl border border-stone-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </aside>
      )}

      {/* Modals */}
      <AddEventModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditingEvent(null);
        }}
        onSave={handleSaveEvent}
        onUpdate={handleUpdateEvent}
        initialDate={addModalDate}
        initialSlot={addModalSlot}
        editingEvent={editingEvent}
        theme={theme}
        isSignedInWithGoogle={!!user && !!token}
      />

      <EventDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
        onDelete={handleDeleteEvent}
        onEdit={handleEditEvent}
        theme={theme}
        isViewOnly={isEffectiveViewOnly}
      />

      <StickerPickerModal
        isOpen={stickerModalOpen}
        onClose={() => setStickerModalOpen(false)}
        dateKey={stickerModalDate}
        slot={stickerModalSlot}
        existingStickers={displayedStickers}
        onAddSticker={handleAddSticker}
        onRemoveSticker={handleRemoveSticker}
        theme={theme}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        shareUrl={shareUrl}
        theme={theme}
        eventsCount={events.length}
        stickersCount={stickers.length}
        isCloudSynced={!!user}
        ownerName={calendarOwnerName !== 'My' ? calendarOwnerName : (user?.displayName || 'คุณ')}
        lastSyncedAt={lastSyncedAt}
      />

      <ThemeSelector
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        currentThemeId={theme.id}
        onSelectTheme={handleSelectTheme}
      />

      <SlotListModal
        isOpen={slotListModalOpen}
        onClose={() => setSlotListModalOpen(false)}
        dateKey={slotListDate}
        slot={slotListSlot}
        events={slotListEvents}
        onSelectEvent={(ev) => {
          setSelectedEvent(ev);
          setDetailModalOpen(true);
        }}
        onAddNewEvent={handleOpenAddEvent}
        onEditEvent={handleEditEvent}
        theme={theme}
        isViewOnly={isEffectiveViewOnly}
      />

      {/* Friends Modal */}
      <FriendsModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        currentUser={
          user
            ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
              }
            : null
        }
        friends={friends}
        onSelectFriendToView={(friend) => {
          setViewingFriend(friend);
          showToast(`เปิดดูตาราง 3 ช่วงเวลาของ "${friend.displayName}"`);
        }}
        onCompareWithFriend={(friend) => {
          setComparingFriend(friend);
        }}
        onGoogleSignIn={handleGoogleLogin}
        theme={theme}
        showToast={showToast}
        initialSearchTerm={initialFriendSearchTerm}
      />

      {/* Mutual Free Time Comparison Modal */}
      <CompareScheduleModal
        isOpen={!!comparingFriend}
        onClose={() => setComparingFriend(null)}
        friend={comparingFriend}
        myEvents={events}
        friendEvents={
          comparingFriend?.friendUid === viewingFriend?.friendUid
            ? friendEvents
            : []
        }
        theme={theme}
        currentDate={currentDate}
      />

      {/* Firebase Auth Troubleshooting & Help Modal */}
      <AuthTroubleshootModal
        isOpen={authErrorModalOpen}
        onClose={() => setAuthErrorModalOpen(false)}
        errorInfo={authErrorInfo}
        onRetryWithCalendar={() => handleGoogleLogin(true)}
        onRetryBasicAuth={() => handleGoogleLogin(false)}
        isRetrying={isSigningIn}
      />

      {/* Google Calendar Scope & API Enable Modal */}
      <CalendarScopeModal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        onGrantPermission={() => {
          setIsScopeModalOpen(false);
          syncGoogleCalendar(true);
        }}
        isConnecting={isSyncingGCal}
        isApiDisabled={scopeModalApiDisabled}
        apiEnableUrl={scopeModalApiUrl}
      />
    </div>
  );
}
