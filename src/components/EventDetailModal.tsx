import React, { useState, useEffect } from 'react';
import { CalendarEvent, ThemeConfig } from '../types';
import { formatThaiDate } from '../utils/dateUtils';
import { getDaySpecialInfo } from '../utils/thaiHolidays';
import { X, Clock, MapPin, AlignLeft, Trash2, ExternalLink, AlertTriangle, Edit3 } from 'lucide-react';

interface EventDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onDelete: (event: CalendarEvent) => Promise<void>;
  onEdit?: (event: CalendarEvent) => void;
  theme: ThemeConfig;
  isViewOnly: boolean;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  onClose,
  event,
  onDelete,
  onEdit,
  theme,
  isViewOnly,
}) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Always reset deletion state whenever modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  }, [isOpen, event?.id]);

  if (!isOpen || !event) return null;

  const slotConfig =
    event.slot === 'morning'
      ? theme.slots.morning
      : event.slot === 'afternoon'
      ? theme.slots.afternoon
      : theme.slots.evening;

  const handleClose = () => {
    setIsDeleting(false);
    setShowConfirmDelete(false);
    onClose();
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDelete(event);
      setShowConfirmDelete(false);
      setIsDeleting(false);
      onClose();
    } catch (err) {
      console.error(err);
      setIsDeleting(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="event-detail-modal"
        className={`relative w-full max-w-md rounded-2xl border shadow-xl p-6 transition-all ${
          theme.cardBg
        } ${theme.cardBorder} ${theme.textColor}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {event.slots && event.slots.length > 0 ? (
                event.slots.map((s) => {
                  const sc = theme.slots[s];
                  return (
                    <span
                      key={s}
                      className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sc.activeBg} ${sc.activeText}`}
                    >
                      {sc.nameTh}
                    </span>
                  );
                })
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-semibold ${slotConfig.activeBg} ${slotConfig.activeText}`}
                >
                  {slotConfig.nameTh} ({slotConfig.timeRange})
                </span>
              )}
              {event.isGoogleEvent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-medium">
                  Google Calendar
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold mt-1.5 flex items-center gap-1.5 flex-wrap">
              {event.sticker && <span className="text-xl">{event.sticker}</span>}
              <span>{event.title}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content details */}
        <div className="py-4 space-y-3.5 text-sm">
          <div className="flex items-center gap-2.5 text-stone-600 dark:text-stone-300">
            <Clock className="w-4 h-4 text-amber-500 shrink-0" />
            <div>
              <span className="font-semibold">{formatThaiDate(event.date)}</span>
              <span className="mx-2">•</span>
              <span>{event.startTime} - {event.endTime} น.</span>
            </div>
          </div>

          {/* Holiday and Wan Phra indicator */}
          {(() => {
            const specialInfo = getDaySpecialInfo(event.date);
            if (!specialInfo.isHoliday && !specialInfo.isWanPhra) return null;
            return (
              <div className="space-y-1.5 pt-0.5">
                {specialInfo.isHoliday && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300">
                    <span>🚩</span>
                    <span className="font-semibold">วันหยุดราชการ: {specialInfo.holidayName}</span>
                    {specialInfo.isSubstitution && (
                      <span className="text-[10px] bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-200 px-1.5 py-0.2 rounded font-medium">
                        (ชดเชย)
                      </span>
                    )}
                  </div>
                )}
                {specialInfo.isWanPhra && (
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300">
                    <span>🪷</span>
                    <span className="font-semibold">{specialInfo.wanPhraDescription}</span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-normal">(วันธรรมสวนะ)</span>
                  </div>
                )}
              </div>
            );
          })()}

          {event.location && (
            <div className="flex items-center gap-2.5 text-stone-600 dark:text-stone-300">
              <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-2.5 text-stone-600 dark:text-stone-300 pt-1">
              <AlignLeft className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
              <p className="whitespace-pre-line text-xs leading-relaxed bg-stone-50 dark:bg-stone-900/50 p-3 rounded-xl border border-stone-200 dark:border-stone-800 w-full">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Deletion Confirmation Dialog (Mandatory for mutating Google Calendar data) */}
        {showConfirmDelete ? (
          <div className="mt-2 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 space-y-3">
            <div className="flex items-start gap-2 text-rose-800 dark:text-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">ยืนยันการลบนัดหมายนี้หรือไม่?</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  {event.isGoogleEvent
                    ? `นัดหมาย "${event.title}" จะถูกลบออกจาก Google Calendar ของคุณด้วย`
                    : `นัดหมาย "${event.title}" จะถูกลบออกจากปฏิทิน`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowConfirmDelete(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-rose-300 text-stone-700 dark:text-stone-200 hover:bg-rose-100/50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                id="confirm-delete-event-btn"
                disabled={isDeleting}
                onClick={handleDelete}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    กำลังลบ...
                  </>
                ) : (
                  'ยืนยันการลบ'
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
            {!isViewOnly ? (
              <div className="flex items-center gap-2">
                {onEdit && (
                  <button
                    type="button"
                    id="edit-event-trigger-btn"
                    onClick={() => {
                      onEdit(event);
                      onClose();
                    }}
                    className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    แก้ไข
                  </button>
                )}
                <button
                  type="button"
                  id="delete-event-trigger-btn"
                  onClick={() => setShowConfirmDelete(true)}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบนัดหมาย
                </button>
              </div>
            ) : (
              <span className="text-[11px] text-stone-400 italic">
                โหมดดูอย่างเดียว (ไม่สามารถแก้ไขหรือลบได้)
              </span>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              ปิด
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
