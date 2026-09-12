import React, { useState } from 'react';
import { AuthErrorInfo } from '../services/firebaseAuth';
import {
  AlertTriangle,
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';

interface AuthTroubleshootModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorInfo: AuthErrorInfo | null;
  onRetryWithCalendar: () => void;
  onRetryBasicAuth: () => void;
  isRetrying: boolean;
}

export const AuthTroubleshootModal: React.FC<AuthTroubleshootModalProps> = ({
  isOpen,
  onClose,
  errorInfo,
  onRetryWithCalendar,
  onRetryBasicAuth,
  isRetrying,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !errorInfo) return null;

  // If the popup was closed by the user, show strictly the requested concise message and close button only
  if (
    errorInfo.code === 'auth/popup-closed-by-user' ||
    errorInfo.code === 'auth/cancelled-popup-request'
  ) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
        <div
          id="auth-popup-closed-modal"
          className="relative w-full max-w-sm rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xl p-6 text-stone-800 dark:text-stone-100 transition-all text-center"
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-sm sm:text-base font-semibold text-stone-900 dark:text-stone-100 leading-snug">
              หน้าต่างเข้าสู่ระบบถูกปิด โปรดลองใหม่อีกครั้ง
            </h3>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              id="close-popup-closed-modal-btn"
              onClick={onClose}
              className="w-full sm:w-auto min-w-[100px] px-6 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleCopyDomain = async () => {
    if (!errorInfo.currentDomain) return;
    try {
      await navigator.clipboard.writeText(errorInfo.currentDomain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-troubleshoot-modal"
        className="relative w-full max-w-lg rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-white dark:bg-stone-900 shadow-2xl p-5 sm:p-6 text-stone-800 dark:text-stone-100 transition-all max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {errorInfo.title}
              </h3>
              <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400">
                รหัสข้อผิดพลาด: {errorInfo.code}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message */}
        <div className="py-3 text-xs leading-relaxed text-stone-600 dark:text-stone-300">
          <p className="bg-rose-50/70 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-900/50">
            {errorInfo.message}
          </p>
        </div>

        {/* Project ID Notice (Crucial for mismatched projects) */}
        {errorInfo.firebaseProjectId && (
          <div className="mb-3 p-3 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-stone-700 dark:text-stone-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200">
                โปรเจกต์ Firebase ของแอปนี้:
              </span>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-white dark:bg-stone-900 border border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100 select-all">
                {errorInfo.firebaseProjectId}
              </span>
            </div>
            <p className="text-[10.5px] text-amber-800/90 dark:text-amber-300/90 leading-tight">
              ⚠️ <strong>ข้อควรระวัง:</strong> โปรดสังเกตชื่อโปรเจกต์ที่มุมซ้ายบนของ Firebase Console จะต้องเป็น <strong>{errorInfo.firebaseProjectId}</strong> (หากเพิ่มในโปรเจกต์อื่น เช่น calendar-la-19279 จะไม่เกิดผล)
            </p>
          </div>
        )}

        {/* Current Domain Copy Box (Crucial for Authorized Domains) */}
        {errorInfo.currentDomain && (
          <div className="mb-4 p-3 rounded-xl bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">
                ชื่อโดเมนที่ต้องใส่ใน Firebase Authorized domains:
              </span>
              <button
                type="button"
                onClick={handleCopyDomain}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 font-medium transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 dark:text-emerald-400">คัดลอกแล้ว!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-stone-500" />
                    <span>คัดลอก</span>
                  </>
                )}
              </button>
            </div>
            <div className="p-2 rounded-lg bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 font-mono text-xs text-blue-700 dark:text-blue-300 select-all break-all">
              {errorInfo.currentDomain}
            </div>
            <p className="text-[10px] text-stone-500 italic">
              * สำคัญ: ห้ามมี `https://` หรือเครื่องหมาย `/` ด้านท้าย ให้วางเฉพาะชื่อโดเมนด้านบนเท่านั้น
            </p>
          </div>
        )}

        {/* Action Steps */}
        <div className="space-y-2 mb-4">
          <h4 className="text-xs font-bold text-stone-700 dark:text-stone-200 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
            <span>ขั้นตอนการแก้ไข:</span>
          </h4>
          <ul className="space-y-1.5 text-xs text-stone-600 dark:text-stone-300">
            {errorInfo.solution.map((step, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 bg-stone-50/50 dark:bg-stone-800/40 p-2 rounded-lg border border-stone-100 dark:border-stone-800"
              >
                <span className="text-blue-600 dark:text-blue-400 font-semibold">•</span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Tip if in iframe */}
        {errorInfo.isIframe && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-200 space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <span>💡 กำลังเปิดในหน้าต่างพรีวิว (iframe):</span>
            </p>
            <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
              เบราว์เซอร์อย่าง Chrome และ Safari มีระบบความปลอดภัยป้องกันคุกกี้ข้ามหน้าต่าง (Third-party Cookies) ทำให้หน้าต่าง Popup เข้าสู่ระบบปิดอัตโนมัติ 
              การกด <strong>"เปิดในแท็บใหม่"</strong> จะช่วยให้ล็อกอินได้สำเร็จ 100% ทันที
            </p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
              <span>เปิดในแท็บใหม่</span>
            </button>

            {errorInfo.canRetryWithoutCalendar && (
              <button
                type="button"
                disabled={isRetrying}
                onClick={onRetryBasicAuth}
                title="เข้าสู่ระบบ Firebase เพื่อบันทึกตารางและแชร์ โดยไม่เชื่อม Google Calendar"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-[11px] font-medium text-stone-600 dark:text-stone-300 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>ล็อกอินเฉพาะ Firebase</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors cursor-pointer"
            >
              ปิด
            </button>
            <button
              type="button"
              disabled={isRetrying}
              onClick={onRetryWithCalendar}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
              <span>{isRetrying ? 'กำลังลองใหม่...' : 'ลองล็อกอินอีกครั้ง'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
