import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot, FriendUser } from './types';
import { DEFAULT_THEME, getThemeById, THEMES } from './constants/themes';
import {
  getCalendarGrid,
  THAI_MONTHS,
  formatYearThai,
  formatDateKey,
} from './utils/dateUtils';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  getAccessToken,
  setAccessToken,
  parseFirebaseAuthError,
  AuthErrorInfo,
} from './services/firebaseAuth';
import {
  fetchGoogleCalendarEvents,
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
  InsufficientScopeError,
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
  subscribeToStickers,
  saveStickerToFirestore,
  deleteStickerFromFirestore,
  getSharedEvents,
  getSharedStickers,
  subscribeToFriends,
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
} from 'lucide-react';

const STORAGE_EVENTS_KEY = 'slot_calendar_events_v2';
const STORAGE_STICKERS_KEY = 'slot_calendar_stickers_v2';
const STORAGE_THEME_KEY = 'slot_calendar_theme_id_v2';

export default function App() {
  // Navigation Date
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 8, 12)); // Sept 12, 2026
  const [selectedDateKey, setSelectedDateKey] = useState<string>(() =>
    formatDateKey(2026, 8, 12)
  );
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  // Theme (defaults to Minimalist or saved)
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  // Auth & Google Calendar
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);

  // View-Only Share Mode (Friends can view but CANNOT edit)
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [sharedOwnerName, setSharedOwnerName] = useState<string>('เพื่อนของคุณ');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  // Events & Stickers State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [stickers, setStickers] = useState<StickerPlacement[]>([]);

  // Friend System State
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const [viewingFriend, setViewingFriend] = useState<FriendUser | null>(null);
  const [comparingFriend, setComparingFriend] = useState<FriendUser | null>(null);
  const [friendEvents, setFriendEvents] = useState<CalendarEvent[]>([]);
  const [friendStickers, setFriendStickers] = useState<StickerPlacement[]>([]);
  const [initialFriendSearchTerm, setInitialFriendSearchTerm] = useState<string>('');

  // Firestore sync state tracking
  const [isFirestoreConnected, setIsFirestoreConnected] = useState(false);
  const [isMigratingInitialData, setIsMigratingInitialData] = useState(false);

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

  // Toast message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // 1. Initial Load: Check if opened via View-Only share link or load from local storage
  useEffect(() => {
    const { isViewOnly: viewOnlyFromUrl, calOwnerUid, ownerName, sharedState } =
      checkIsViewOnlyFromUrl();

    if (viewOnlyFromUrl) {
      setIsViewOnly(true);
      const name = ownerName || sharedState?.ownerName || 'เพื่อนของคุณ';
      setSharedOwnerName(name);

      if (sharedState?.themeId) {
        setTheme(getThemeById(sharedState.themeId));
      }

      // If a Firebase owner UID is provided in the URL, load live from Firestore Calendar-LA
      if (calOwnerUid) {
        // Fetch owner profile to get custom theme & name
        getUserProfile(calOwnerUid).then((profile) => {
          if (profile?.displayName) {
            setSharedOwnerName(profile.displayName);
          }
          if (profile?.themeId) {
            setTheme(getThemeById(profile.themeId));
          }
        }).catch((err) => console.warn('Could not fetch owner profile:', err));

        // Fetch shared events and stickers
        getSharedEvents(calOwnerUid)
          .then((cloudEvents) => {
            if (cloudEvents.length > 0) {
              setEvents(cloudEvents);
            } else if (sharedState?.events) {
              setEvents(sharedState.events);
            }
          })
          .catch(() => {
            if (sharedState?.events) setEvents(sharedState.events);
          });

        getSharedStickers(calOwnerUid)
          .then((cloudStickers) => {
            if (cloudStickers.length > 0) {
              setStickers(cloudStickers);
            } else if (sharedState?.stickers) {
              setStickers(sharedState.stickers);
            }
          })
          .catch(() => {
            if (sharedState?.stickers) setStickers(sharedState.stickers);
          });

        setIsFirestoreConnected(true);
      } else if (sharedState) {
        // Fallback to URL encoded snapshot
        setEvents(sharedState.events || []);
        setStickers(sharedState.stickers || []);
      }
      return;
    }

    // Normal mode: Load stored theme
    const savedThemeId = localStorage.getItem(STORAGE_THEME_KEY);
    if (savedThemeId) {
      setTheme(getThemeById(savedThemeId));
    }

    // Load stored stickers
    const savedStickers = localStorage.getItem(STORAGE_STICKERS_KEY);
    if (savedStickers) {
      try {
        setStickers(JSON.parse(savedStickers));
      } catch (e) {
        console.error('Error parsing stickers:', e);
      }
    } else {
      const sampleStickers: StickerPlacement[] = [
        { id: 'st-1', date: '2026-09-12', emoji: '⭐', name: 'สำคัญพิเศษ', createdAt: Date.now() },
        { id: 'st-2', date: '2026-09-15', emoji: '💻', name: 'งานคอม', createdAt: Date.now() },
        { id: 'st-3', date: '2026-09-18', emoji: '🎉', name: 'ปาร์ตี้', createdAt: Date.now() },
        { id: 'st-4', date: '2026-09-20', emoji: '🏃', name: 'วิ่งออกกำลังกาย', createdAt: Date.now() },
      ];
      setStickers(sampleStickers);
    }

    // Load stored events
    const savedEvents = localStorage.getItem(STORAGE_EVENTS_KEY);
    if (savedEvents) {
      try {
        setEvents(JSON.parse(savedEvents));
      } catch (e) {
        console.error('Error parsing events:', e);
      }
    } else {
      const initialEvents: CalendarEvent[] = [
        {
          id: 'sample-1',
          title: 'ประชุมวางแผนกลยุทธ์ทีม',
          sticker: '💼',
          description: 'สรุปเป้าหมายไตรมาสและงานโปรเจกต์',
          date: '2026-09-12',
          slot: 'morning',
          slots: ['morning'],
          startTime: '09:30',
          endTime: '11:00',
          location: 'ห้องประชุมชั้น 4',
        },
        {
          id: 'sample-2',
          title: 'พบลูกค้าส่งมอบระบบ',
          sticker: '💻',
          description: 'Demo ฟีเจอร์ใหม่และรับฟัง feedback',
          date: '2026-09-12',
          slot: 'afternoon',
          slots: ['afternoon'],
          startTime: '14:00',
          endTime: '15:30',
          location: 'สยามสแควร์วัน',
        },
        {
          id: 'sample-3',
          title: 'ดินเนอร์ฉลองวันเกิดเพื่อน',
          sticker: '🎂',
          description: 'นัดทานอาหารญี่ปุ่น',
          date: '2026-09-12',
          slot: 'evening',
          slots: ['evening'],
          startTime: '19:00',
          endTime: '21:00',
          location: 'EmQuartier',
        },
        {
          id: 'sample-4',
          title: 'ตรวจสุขภาพประจำปี',
          sticker: '🏥',
          description: 'งดน้ำงดอาหารหลัง 22:00',
          date: '2026-09-15',
          slot: 'morning',
          slots: ['morning'],
          startTime: '08:00',
          endTime: '10:30',
          location: 'โรงพยาบาลกรุงเทพ',
        },
        {
          id: 'sample-5',
          title: 'สัมมนาออนไลน์ AI Trends',
          sticker: '🚀',
          description: 'Google AI Developers Session',
          date: '2026-09-15',
          slot: 'afternoon',
          slots: ['afternoon'],
          startTime: '13:30',
          endTime: '16:00',
          location: 'Google Meet',
        },
        {
          id: 'sample-6',
          title: 'ฟิตเนส & โยคะผ่อนคลาย',
          sticker: '🧘',
          description: 'คลาสยืดกล้ามเนื้อเย็นวันศุกร์',
          date: '2026-09-18',
          slot: 'evening',
          slots: ['evening'],
          startTime: '18:30',
          endTime: '20:00',
          location: 'Fitness Club',
        },
      ];
      setEvents(initialEvents);
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
    if (!isViewOnly && events.length > 0) {
      localStorage.setItem(STORAGE_EVENTS_KEY, JSON.stringify(events));
    }
  }, [events, isViewOnly]);

  useEffect(() => {
    if (!isViewOnly && stickers.length > 0) {
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

    // 1. Update/Save user profile in Firestore
    saveUserProfile({
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'ผู้ใช้งาน',
      photoURL: user.photoURL || '',
      themeId: theme.id,
      updatedAt: new Date().toISOString(),
    }).catch((e) => console.warn('User profile sync error:', e));

    // 2. Subscribe to user's events in Firestore Calendar-LA
    const unsubscribeEvents = subscribeToEvents(
      user.uid,
      (cloudEvents) => {
        if (cloudEvents.length > 0) {
          // Merge cloud events with any Google Calendar events currently loaded
          setEvents((prev) => {
            const googleEvents = prev.filter((e) => e.isGoogleEvent);
            const cloudIds = new Set(cloudEvents.map((e) => e.id));
            const uniqueGoogle = googleEvents.filter((g) => !cloudIds.has(g.id));
            return [...cloudEvents, ...uniqueGoogle];
          });
        } else if (events.length > 0 && !isMigratingInitialData) {
          // Seed initial local events into Firestore so user's data isn't blank
          setIsMigratingInitialData(true);
          events.forEach((ev) => {
            saveEventToFirestore(user.uid, ev).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore events listener:', err)
    );

    // 3. Subscribe to user's stickers in Firestore Calendar-LA
    const unsubscribeStickers = subscribeToStickers(
      user.uid,
      (cloudStickers) => {
        if (cloudStickers.length > 0) {
          setStickers(cloudStickers);
        } else if (stickers.length > 0 && !isMigratingInitialData) {
          stickers.forEach((stk) => {
            saveStickerToFirestore(user.uid, stk).catch(console.error);
          });
        }
      },
      (err) => console.warn('Firestore stickers listener:', err)
    );

    // 4. Subscribe to user's friends in Firestore Calendar-LA
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

  // Sync with Google Calendar
  const syncGoogleCalendar = useCallback(async () => {
    const accessToken = token || getAccessToken();
    if (!accessToken) {
      showToast('ยังไม่ได้เชื่อมต่อ Google Calendar');
      return;
    }

    setIsSyncingGCal(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const timeMin = new Date(year, month - 1, 1).toISOString();
      const timeMax = new Date(year, month + 2, 0, 23, 59, 59).toISOString();

      const gEvents = await fetchGoogleCalendarEvents(accessToken, timeMin, timeMax);

      setEvents((prev) => {
        const nonGoogle = prev.filter((e) => !e.isGoogleEvent);
        return [...nonGoogle, ...gEvents];
      });

      setGcalConnected(true);
      showToast(`รีเฟรช Google Calendar สำเร็จ (พบนัดหมาย ${gEvents.length} รายการ)`);
    } catch (err: any) {
      console.warn('Google Calendar sync notice:', err);
      if (
        err instanceof InsufficientScopeError ||
        err?.message?.includes('insufficient') ||
        err?.message?.includes('403') ||
        err?.message?.includes('401')
      ) {
        setToken(null);
        setGcalConnected(false);
        setAccessToken(null);
        showToast('สิทธิ์ Google Calendar ไม่เพียงพอหรือหมดอายุ โปรดเข้าสู่ระบบใหม่');
      } else {
        showToast('ไม่สามารถดึงข้อมูลจาก Google Calendar ได้');
      }
    } finally {
      setIsSyncingGCal(false);
    }
  }, [token, currentDate]);

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
          const timeMin = new Date(year, month - 1, 1).toISOString();
          const timeMax = new Date(year, month + 2, 0, 23, 59, 59).toISOString();

          try {
            const gEvents = await fetchGoogleCalendarEvents(res.accessToken, timeMin, timeMax);
            if (gEvents.length > 0) {
              setEvents((prev) => {
                const nonGoogle = prev.filter((e) => !e.isGoogleEvent);
                return [...nonGoogle, ...gEvents];
              });
              showToast(`เชื่อมต่อ Google Calendar สำเร็จ (นำเข้า ${gEvents.length} นัดหมาย)`);
            }
          } catch (gcalErr: any) {
            console.warn('Initial Google Calendar fetch notice:', gcalErr);
            if (
              gcalErr instanceof InsufficientScopeError ||
              gcalErr?.message?.includes('insufficient') ||
              gcalErr?.message?.includes('403')
            ) {
              setToken(null);
              setGcalConnected(false);
              setAccessToken(null);
              showToast('เข้าสู่ระบบสำเร็จ (แต่ยังไม่ได้รับสิทธิ์ Google Calendar)');
            }
          }
        } else {
          setToken(null);
          setGcalConnected(false);
          showToast(`เข้าสู่ระบบสำเร็จ: ${res.user.displayName || res.user.email}`);
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
      setEvents((prev) => prev.filter((e) => !e.isGoogleEvent));
      showToast('ออกจากระบบ Google เรียบร้อยแล้ว');
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

    setEvents((prev) => prev.map((e) => (e.id === eventId ? updatedEvent : e)));

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

    setEvents((prev) => [...prev, newEvent]);

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

    setEvents((prev) => prev.filter((e) => e.id !== event.id));

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

    setStickers((prev) => [...prev, newSticker]);

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

    setStickers((prev) => prev.filter((s) => s.id !== stickerId));

    // Delete from Firestore Calendar-LA if user is signed in
    if (user) {
      deleteStickerFromFirestore(user.uid, stickerId).catch((err) => {
        console.error('Firestore sticker delete error:', err);
      });
    }
  };

  // Slot Click Handler
  const handleSlotClick = (dateKey: string, slot: TimeSlot, slotEvents: CalendarEvent[]) => {
    setSelectedDateKey(dateKey);
    setSlotListDate(dateKey);
    setSlotListSlot(slot);
    setSlotListEvents(slotEvents);
    setSlotListModalOpen(true);
  };

  // Share Handler (generates read-only link for friends)
  const handleOpenShareModal = () => {
    const url = generateShareUrl(
      events,
      stickers,
      theme.id,
      user?.displayName || 'เจ้าของปฏิทิน',
      user?.uid
    );
    setShareUrl(url);
    setIsShareModalOpen(true);
  };

  // Theme Change (Multiple themes)
  const handleSelectTheme = (newTheme: ThemeConfig) => {
    setTheme(newTheme);
    if (!isViewOnly) {
      localStorage.setItem(STORAGE_THEME_KEY, newTheme.id);
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
          className="bg-stone-900 text-white px-3.5 py-2.5 text-xs flex items-center justify-between gap-3 border-b border-stone-800 shadow-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1 rounded-md bg-amber-500/20 text-amber-400 shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div className="truncate">
              <span className="font-bold text-amber-300">
                โหมดดูอย่างเดียว (Read-Only):
              </span>{' '}
              <span className="text-stone-200">
                คุณกำลังดูปฏิทินของ <strong>{sharedOwnerName}</strong> (ไม่สามารถแก้ไขหรือลบได้)
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = window.location.origin + window.location.pathname;
            }}
            className="px-3 py-1 rounded-lg bg-white text-stone-900 font-bold hover:bg-stone-100 transition-colors text-xs shrink-0 shadow-xs"
          >
            ไปยังปฏิทินของฉัน
          </button>
        </aside>
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

              {isViewOnly ? (
                <div className="min-w-0 max-w-[150px] sm:max-w-none">
                  <h1 className="text-xs sm:text-base font-bold tracking-tight truncate text-stone-900">
                    ปฏิทินของ {sharedOwnerName}
                  </h1>
                </div>
              ) : (
                <span className="font-bold text-xs sm:text-sm tracking-tight text-stone-900">
                  Slot Calendar
                </span>
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

              {/* Google Calendar Controls - Single Unified Button: "Google" if not logged in, "รีเฟรช" if logged in */}
              {!isViewOnly && (
                <>
                  {user ? (
                    <div className="flex items-center gap-1 shrink-0">
                      {/* Logged in: Displays "รีเฟรช" button */}
                      <button
                        type="button"
                        id="refresh-gcal-btn"
                        onClick={syncGoogleCalendar}
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
        ownerName={user?.displayName || 'คุณ'}
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
    </div>
  );
}
