import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar',
];

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize token from sessionStorage if available
try {
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('gcal_access_token');
    if (stored) {
      cachedAccessToken = stored;
    }
  }
} catch {
  // Ignore sessionStorage access errors
}

export const getAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('gcal_access_token');
      if (stored) {
        cachedAccessToken = stored;
        return stored;
      }
    }
  } catch {
    // Ignore sessionStorage access errors
  }
  return null;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('gcal_access_token', token);
      } else {
        sessionStorage.removeItem('gcal_access_token');
      }
    }
  } catch {
    // Ignore sessionStorage access errors
  }
};

// Initialize auth state listener.
// CRITICAL: A non-null Firebase user is ALWAYS authenticated in Firebase/Firestore.
// Missing Google Calendar token must NOT log the user out!
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      const token = getAccessToken();
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else {
      setAccessToken(null);
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export interface GoogleSignInResult {
  user: User;
  accessToken: string | null;
  hasCalendarAccess: boolean;
}

// Sign in with Google (with or without calendar.events scope)
export const googleSignIn = async (
  includeCalendarScope: boolean = true
): Promise<GoogleSignInResult> => {
  try {
    isSigningIn = true;
    const provider = new GoogleAuthProvider();
    if (includeCalendarScope) {
      GOOGLE_CALENDAR_SCOPES.forEach((scope) => provider.addScope(scope));
    }
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const rawToken = credential?.accessToken || null;

    // Only store and return access token as calendar token if calendar scope was requested
    const calendarToken = includeCalendarScope ? rawToken : null;
    if (calendarToken) {
      setAccessToken(calendarToken);
    } else {
      setAccessToken(null);
    }

    return {
      user: result.user,
      accessToken: calendarToken,
      hasCalendarAccess: Boolean(calendarToken),
    };
  } catch (error: any) {
    if (
      error?.code === 'auth/popup-closed-by-user' ||
      error?.code === 'auth/cancelled-popup-request'
    ) {
      console.info('Google sign-in popup closed by user.');
    } else if (error?.code === 'auth/popup-blocked') {
      console.warn('Google sign-in popup blocked by browser.');
    } else {
      console.error('Sign-in error:', error);
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const googleSignOut = async (): Promise<void> => {
  await signOut(auth);
  setAccessToken(null);
};

export interface AuthErrorInfo {
  code: string;
  title: string;
  message: string;
  solution: string[];
  currentDomain: string;
  firebaseProjectId?: string;
  canRetryWithoutCalendar: boolean;
  isIframe: boolean;
}

export const parseFirebaseAuthError = (error: any): AuthErrorInfo => {
  const code: string = error?.code || 'unknown';
  const rawMessage: string = error?.message || String(error);
  const currentDomain: string = typeof window !== 'undefined' ? window.location.hostname : '';
  const isIframe: boolean = typeof window !== 'undefined' && window.self !== window.top;
  const firebaseProjectId: string = firebaseConfig?.projectId || '';

  if (code === 'auth/unauthorized-domain') {
    return {
      code,
      title: 'โดเมนยังไม่ได้รับอนุญาตใน Firebase (Unauthorized Domain)',
      message: `Firebase ไม่อนุญาตให้ล็อกอินจากโดเมนนี้: ${currentDomain}`,
      solution: [
        `1. ไปที่ Firebase Console (https://console.firebase.google.com)`,
        `2. สำคัญมาก: เลือกโปรเจกต์ "${firebaseProjectId}" (โปรดตรวจดูชื่อโปรเจกต์ที่มุมซ้ายบนของ Firebase Console ว่าตรงกัน)`,
        `3. ไปที่เมนู Authentication -> แท็บ Settings -> หัวข้อ Authorized domains`,
        `4. กดปุ่ม "Add domain" แล้ววางชื่อโดเมน: ${currentDomain}`,
        `5. ตรวจสอบว่าไม่มี "https://" หรือเครื่องหมาย "/" ด้านท้ายชื่อโดเมน`,
        `6. กด Save แล้วรอประมาณ 10-20 วินาที จากนั้นลองกดล็อกอินอีกครั้ง`,
      ],
      currentDomain,
      firebaseProjectId,
      canRetryWithoutCalendar: false,
      isIframe,
    };
  }

  if (code === 'auth/operation-not-allowed') {
    return {
      code,
      title: 'ยังไม่ได้เปิดใช้งาน Google Sign-In ใน Firebase',
      message: 'ผู้ให้บริการ Google (Google Provider) ยังไม่ได้ถูกเปิดใช้งานใน Firebase Authentication',
      solution: [
        `1. ไปที่ Firebase Console -> เมนู Authentication -> แท็บ Sign-in method`,
        `2. คลิกที่ "Google" ในรายการ Sign-in providers`,
        `3. สับสวิตช์เปิดใช้งาน (Enable)`,
        `4. เลือก Project support email ของคุณ แล้วกด "Save"`,
        `5. กลับมาที่หน้านี้แล้วกดลองล็อกอินใหม่อีกครั้ง`,
      ],
      currentDomain,
      canRetryWithoutCalendar: false,
      isIframe,
    };
  }

  if (code === 'auth/popup-blocked') {
    return {
      code,
      title: 'เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป (Popup Blocked)',
      message: 'เบราว์เซอร์ของคุณป้องกันการเปิดหน้าต่างล็อกอินของ Google',
      solution: [
        '1. สังเกตที่แถบที่อยู่ (Address bar) ของเบราว์เซอร์ด้านบน จะมีไอคอนแจ้งเตือนป๊อปอัปถูกบล็อก',
        '2. กดที่ไอคอนนั้น แล้วเลือก "Always allow popups from this site" (อนุญาตป๊อปอัปเสมอ)',
        '3. หรือกดปุ่ม "เปิดในแท็บใหม่" ด้านล่าง เพื่อเข้าสู่ระบบในหน้าต่างหลัก',
      ],
      currentDomain,
      canRetryWithoutCalendar: false,
      isIframe,
    };
  }

  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return {
      code,
      title: 'หน้าต่างเข้าสู่ระบบถูกปิด โปรดลองใหม่อีกครั้ง',
      message: 'หน้าต่างเข้าสู่ระบบถูกปิด โปรดลองใหม่อีกครั้ง',
      solution: [],
      currentDomain: '',
      canRetryWithoutCalendar: false,
      isIframe,
    };
  }

  return {
    code,
    title: 'ไม่สามารถเข้าสู่ระบบ Google ได้',
    message: rawMessage,
    solution: [
      `1. ตรวจสอบว่าได้เพิ่มชื่อโดเมน "${currentDomain}" ใน Firebase Console -> Authentication -> Settings -> Authorized domains เรียบร้อยแล้ว`,
      `2. ตรวจสอบว่าในแท็บ Sign-in method ได้เปิดใช้งาน Google (Enabled) แล้ว`,
      isIframe
        ? '3. หากยังล็อกอินไม่ได้ แนะนำให้กดปุ่ม "เปิดในแท็บใหม่" ด้านล่าง เพื่อเปิดในหน้าต่างเต็ม'
        : '3. สามารถลองกด "ล็อกอินเฉพาะ Firebase" ด้านล่าง เพื่อใช้งานปฏิทินและบันทึกข้อมูลร่วมกับเพื่อน',
    ],
    currentDomain,
    canRetryWithoutCalendar: true,
    isIframe,
  };
};
