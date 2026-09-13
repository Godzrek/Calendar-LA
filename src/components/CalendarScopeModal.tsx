import React from 'react';
import {
  Calendar as CalendarIcon,
  CheckSquare,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  X,
  ShieldAlert,
} from 'lucide-react';

interface CalendarScopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGrantPermission: () => void;
  isConnecting: boolean;
  isApiDisabled?: boolean;
  apiEnableUrl?: string;
}

export const CalendarScopeModal: React.FC<CalendarScopeModalProps> = ({
  isOpen,
  onClose,
  onGrantPermission,
  isConnecting,
  isApiDisabled = false,
  apiEnableUrl = 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
}) => {
  if (!isOpen) return null;

  const isIframe = typeof window !== 'undefined' && window.self !== window.top;

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="calendar-scope-modal"
        className="relative w-full max-w-lg rounded-2xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 shadow-2xl p-5 sm:p-6 text-stone-800 dark:text-stone-100 transition-all max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400">
              {isApiDisabled ? <ShieldAlert className="w-5 h-5" /> : <CalendarIcon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {isApiDisabled
                  ? 'ยังไม่ได้เปิดใช้งาน Google Calendar API'
                  : 'ขั้นตอนการอนุญาตดึงข้อมูล Google Calendar'}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                {isApiDisabled
                  ? 'จำเป็นต้องเปิดใช้งาน API บน Google Cloud'
                  : 'ต้องทำเครื่องหมายถูก [✓] เพื่ออนุญาตให้ระบบเข้าถึง'}
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

        {/* Content Body */}
        <div className="py-3.5 space-y-3.5 text-xs text-stone-600 dark:text-stone-300">
          {isApiDisabled ? (
            <div className="space-y-3">
              <p className="leading-relaxed bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200">
                Google Cloud Project แจ้งว่ายังไม่ได้เปิดใช้งาน <strong>Google Calendar API</strong> สำหรับโปรเจกต์นี้
              </p>
              <div className="p-3 bg-stone-50 dark:bg-stone-800/80 rounded-xl border border-stone-200 dark:border-stone-700 space-y-2">
                <p className="font-semibold text-stone-800 dark:text-stone-100">
                  วิธีเปิดใช้งาน (ทำเพียงครั้งเดียว):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-stone-600 dark:text-stone-300">
                  <li>กดปุ่ม &quot;เปิดหน้า Google Calendar API&quot; ด้านล่าง</li>
                  <li>กดปุ่มสีฟ้า <strong>&quot;ENABLE&quot; (เปิดใช้งาน)</strong> ในหน้าคอนโซลของ Google</li>
                  <li>กลับมาที่หน้านี้แล้วกดปุ่ม &quot;ลองดึงข้อมูลอีกครั้ง&quot;</li>
                </ol>
                <a
                  href={apiEnableUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดหน้า Google Calendar API ใน Google Cloud</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="leading-relaxed">
                เนื่องจากระบบความปลอดภัยของ Google (Granular Permissions) ในหน้าต่างเข้าสู่ระบบ Google จะมี <strong>ช่องสี่เหลี่ยมให้ทำเครื่องหมายถูก</strong> เพื่อขออนุญาตเข้าถึงปฏิทิน
              </p>

              {/* Visual Box showing what user must check */}
              <div className="p-3.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <p className="font-bold text-blue-950 dark:text-blue-200 text-xs flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>โปรดสังเกตและทำเครื่องหมายถูก [✓] ที่ช่องนี้:</span>
                </p>
                <div className="bg-white dark:bg-stone-900 p-3 rounded-lg border border-blue-300 dark:border-blue-700/80 text-stone-800 dark:text-stone-100 shadow-2xs">
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 mt-0.5 rounded border-2 border-blue-600 bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <svg className="w-3 h-3 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-xs text-stone-900 dark:text-stone-100">
                        ดู แก้ไข แชร์ และลบปฏิทินทั้งหมดที่คุณใช้ใน Google ปฏิทิน
                      </p>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        (See, edit, share, and permanently delete all the calendars you can access using Google Calendar)
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-blue-800/90 dark:text-blue-300/90 leading-tight">
                  💡 หากไม่ได้ติ๊กเลือกช่องนี้ Google จะไม่อนุญาตให้ดึงข้อมูลนัดหมายเข้าสู่ปฏิทิน
                </p>
              </div>

              {isIframe && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    หากหน้าต่าง Google เด้งแล้วปิดไปทันที แนะนำให้กดปุ่ม <strong>&quot;เปิดในแท็บใหม่&quot;</strong> เพื่อเข้าสู่ระบบในหน้าต่างหลัก
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3.5 border-t border-stone-200 dark:border-stone-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isIframe && (
              <button
                type="button"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-200 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>เปิดในแท็บใหม่</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl text-xs font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-400 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
          </div>

          <button
            type="button"
            disabled={isConnecting}
            onClick={onGrantPermission}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>{isConnecting ? 'กำลังเปิดหน้าต่าง...' : 'กดอนุญาตสิทธิ์ Google Calendar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
