import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { ThemeConfig } from '../types';
import { formatLastUpdatedThai } from '../utils/dateUtils';
import { X, Copy, Check, Share2, ShieldCheck, ExternalLink, Cloud, Download, QrCode as QrIcon, Clock } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  theme: ThemeConfig;
  eventsCount: number;
  stickersCount: number;
  isCloudSynced: boolean;
  ownerName: string;
  lastSyncedAt?: string;
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
  lastSyncedAt,
}) => {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(true);

  // Generate QR Code locally via client-side canvas/SVG (100% reliable, zero external dependencies)
  useEffect(() => {
    if (!shareUrl) return;
    let isCancelled = false;
    setQrLoading(true);

    const generateQrCode = async () => {
      // 1. Try high-resolution Canvas DataURL first
      try {
        const url = await QRCode.toDataURL(shareUrl, {
          width: 360,
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'L',
        });
        if (!isCancelled) {
          setQrDataUrl(url);
          setQrLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Canvas QR generation failed, attempting SVG vector fallback:', err);
      }

      // 2. Fallback to pure SVG string (bypasses any HTML5 canvas sandbox restrictions)
      try {
        const svgString = await QRCode.toString(shareUrl, {
          type: 'svg',
          margin: 2,
          color: {
            dark: '#1c1917',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'L',
        });
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;
        if (!isCancelled) {
          setQrDataUrl(svgDataUrl);
          setQrLoading(false);
          return;
        }
      } catch (svgErr) {
        console.warn('SVG QR generation failed, attempting online generator fallback:', svgErr);
      }

      // 3. Fallback to high-reliability online QR generator
      if (!isCancelled) {
        setQrDataUrl(
          `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=10&data=${encodeURIComponent(
            shareUrl
          )}`
        );
        setQrLoading(false);
      }
    };

    generateQrCode();

    return () => {
      isCancelled = true;
    };
  }, [shareUrl]);

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

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const isSvg = qrDataUrl.startsWith('data:image/svg');
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `calendar-share-${encodeURIComponent(ownerName || 'friend')}.${isSvg ? 'svg' : 'png'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="share-modal"
        className={`relative w-full max-w-md rounded-2xl border shadow-xl p-5 sm:p-6 transition-all ${
          theme.cardBg
        } ${theme.cardBorder} ${theme.textColor} max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">แชร์ปฏิทินให้เพื่อนดู</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                เพื่อนดูได้อย่างเดียว ไม่สามารถแก้ไขได้ (Read-Only)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Guarantee Notice */}
        <div className="my-3.5 p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>ระบบความปลอดภัย: สิทธิ์ดูอย่างเดียว (Read-Only)</span>
          </div>
          <p className="text-blue-800 dark:text-blue-200 text-[11px] leading-relaxed">
            เพื่อนที่กดเข้ามาดูจากลิงก์หรือสแกน QR Code จะเห็นนัดหมาย ({eventsCount} รายการ) และสติ๊กเกอร์ ({stickersCount} ชิ้น) ของ <strong>{ownerName}</strong> โดยปุ่มเพิ่ม ลบ และแก้ไขจะถูกปิดใช้งานทั้งหมด ป้องกันการเปลี่ยนแปลงข้อมูลโดยไม่ได้ตั้งใจ
          </p>
          {isCloudSynced && (
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 dark:text-emerald-300 font-semibold pt-1 border-t border-blue-200/60 dark:border-blue-900/60">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>เชื่อมต่อฐานข้อมูล Firebase เรียลไทม์ (เมื่อคุณอัปเดตนัดหมาย เพื่อนจะเห็นทันที)</span>
            </div>
          )}
          {lastSyncedAt && (
            <div className="flex items-center gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-semibold pt-1 border-t border-blue-200/60 dark:border-blue-900/60">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>ข้อมูลล่าสุดในฐานข้อมูล ณ วันที่: {formatLastUpdatedThai(lastSyncedAt)}</span>
            </div>
          )}
        </div>

        {/* Share Link Box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300">
            ลิงก์สำหรับแชร์ (View-Only Link):
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-200 truncate focus:outline-hidden font-mono"
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

        {/* QR Code & Actions */}
        <div className="mt-4 pt-3 border-t border-stone-200 dark:border-stone-700 flex flex-col items-center">
          <div className="flex items-center gap-1.5 text-xs text-stone-700 dark:text-stone-300 font-semibold mb-2 text-center">
            <QrIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>สแกน QR Code ด้วยมือถือเพื่อดูปฏิทิน:</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border-2 border-stone-200 shadow-md mb-2 flex flex-col items-center justify-center min-w-[210px] min-h-[210px]">
            {qrLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 p-6 text-stone-400 text-xs">
                <div className="w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <span>กำลังสร้าง QR Code...</span>
              </div>
            ) : qrDataUrl ? (
              <>
                <img
                  src={qrDataUrl}
                  alt={`QR Code สำหรับแชร์ปฏิทินของ ${ownerName}`}
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-md"
                />
                <span className="text-[10px] text-stone-500 font-medium mt-1">
                  ใช้กล้อง iPhone / Android หรือ LINE สแกนได้ทันที
                </span>
              </>
            ) : (
              <div className="p-4 text-center text-xs text-rose-500">
                ไม่สามารถสร้าง QR Code ได้
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 mt-1.5">
            {qrDataUrl && (
              <button
                type="button"
                onClick={handleDownloadQr}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center gap-1.5 transition-colors border border-stone-200 dark:border-stone-700 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>บันทึกรูป QR Code</span>
              </button>
            )}

            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center gap-1.5 transition-colors border border-blue-200 dark:border-blue-900 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>เปิดทดสอบในแท็บใหม่</span>
            </a>
          </div>
        </div>

        <div className="mt-4 pt-2 border-t border-stone-100 dark:border-stone-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
