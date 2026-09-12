import React, { useState } from 'react';
import { ThemeConfig } from '../types';
import { X, Copy, Check, Share2, Eye, ShieldCheck, ExternalLink, Cloud } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  theme: ThemeConfig;
  eventsCount: number;
  stickersCount: number;
  isCloudSynced: boolean;
  ownerName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  theme,
  eventsCount,
  stickersCount,
  isCloudSynced,
  ownerName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const qrCodeUrl = `https://quickchart.io/qr?text=${encodeURIComponent(
    shareUrl
  )}&size=200&margin=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="share-modal"
        className={`relative w-full max-w-md rounded-2xl border shadow-xl p-5 sm:p-6 transition-all ${
          theme.cardBg
        } ${theme.cardBorder} ${theme.textColor} max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">แชร์ปฏิทินให้เพื่อนดู</h3>
              <p className="text-xs text-stone-500">
                เพื่อนดูได้อย่างเดียว ไม่สามารถแก้ไขได้ (Read-Only)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Guarantee Notice */}
        <div className="my-3.5 p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-blue-900 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
            <span>ระบบความปลอดภัย: สิทธิ์ดูอย่างเดียว (Read-Only)</span>
          </div>
          <p className="text-blue-800 text-[11px] leading-relaxed">
            เพื่อนที่กดเข้ามาดูจากลิงก์นี้ จะเห็นนัดหมาย ({eventsCount} รายการ) และสติ๊กเกอร์ ({stickersCount} ชิ้น) ของ {ownerName} แต่ปุ่มเพิ่ม ลบ และแก้ไขจะถูกปิดใช้งานทั้งหมด ป้องกันการเปลี่ยนแปลงข้อมูลโดยไม่ได้ตั้งใจ
          </p>
          {isCloudSynced && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-semibold pt-1 border-t border-blue-200/60">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>เชื่อมต่อฐานข้อมูล Firebase (Calendar-LA) แบบเรียลไทม์</span>
            </div>
          )}
        </div>

        {/* Share Link Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-700">
            ลิงก์สำหรับแชร์ (View-Only Link):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 bg-stone-50 text-stone-800 truncate focus:outline-hidden font-mono"
            />
            <button
              type="button"
              id="copy-share-link-btn"
              onClick={handleCopy}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-600 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  คัดลอกแล้ว!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  คัดลอกลิงก์
                </>
              )}
            </button>
          </div>
        </div>

        {/* QR Code & Preview Link */}
        <div className="mt-4 pt-3 border-t border-stone-200 flex flex-col items-center">
          <p className="text-xs text-stone-500 mb-2">หรือให้เพื่อนสแกน QR Code ผ่านมือถือ:</p>
          <div className="p-2 rounded-xl bg-white border border-stone-200 shadow-2xs mb-3">
            <img
              src={qrCodeUrl}
              alt="Calendar Share QR Code"
              className="w-32 h-32 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-medium"
          >
            <span>ทดลองเปิดดูในหน้าต่างใหม่ (โหมดดูอย่างเดียว)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="mt-4 pt-2 border-t border-stone-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
