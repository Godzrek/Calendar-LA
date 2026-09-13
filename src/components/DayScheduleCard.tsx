import React from 'react';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { formatThaiDate, filterEventsBySlot, formatDateKey } from '../utils/dateUtils';
import { getDaySpecialInfo } from '../utils/thaiHolidays';
import { Plus, Clock, MapPin, Sparkles, ChevronRight } from 'lucide-react';

interface DayScheduleCardProps {
  dateKey: string;
  theme: ThemeConfig;
  events: CalendarEvent[];
  stickers: StickerPlacement[];
  isViewOnly: boolean;
  onAddEvent: (dateKey: string, slot: TimeSlot) => void;
  onEventClick: (event: CalendarEvent) => void;
  onOpenStickers: (dateKey: string) => void;
}

export const DayScheduleCard: React.FC<DayScheduleCardProps> = ({
  dateKey,
  theme,
  events,
  stickers,
  isViewOnly,
  onAddEvent,
  onEventClick,
  onOpenStickers,
}) => {
  const dayStickers = stickers.filter((s) => s.date === dateKey);

  const slots: Array<{
    key: TimeSlot;
    title: string;
    timeRange: string;
    config: typeof theme.slots.morning;
  }> = [
    {
      key: 'morning',
      title: theme.slots.morning.nameTh,
      timeRange: theme.slots.morning.timeRange,
      config: theme.slots.morning,
    },
    {
      key: 'afternoon',
      title: theme.slots.afternoon.nameTh,
      timeRange: theme.slots.afternoon.timeRange,
      config: theme.slots.afternoon,
    },
    {
      key: 'evening',
      title: theme.slots.evening.nameTh,
      timeRange: theme.slots.evening.timeRange,
      config: theme.slots.evening,
    },
  ];

  const specialInfo = getDaySpecialInfo(dateKey);
  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const isToday = dateKey === todayKey;

  return (
    <div
      id="mobile-day-schedule"
      className={`mt-3 rounded-2xl border p-3.5 sm:p-4 shadow-xs transition-colors ${
        isToday
          ? theme.isDark
            ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/50'
            : 'bg-amber-50/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
          : specialInfo.isHoliday
          ? 'bg-stone-100 dark:bg-stone-800/90 border-stone-300 dark:border-stone-700'
          : 'border-stone-200/80 bg-white dark:bg-stone-900'
      }`}
    >
      {/* Date Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 leading-tight">
                ตารางนัดหมาย: {formatThaiDate(dateKey)}
              </h3>
              {isToday && (
                <span
                  title="วันนี้ (Today)"
                  className="relative flex h-2 w-2 shrink-0 ml-1"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-600 dark:bg-amber-400" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-stone-400">
              แตะรายการเพื่อดูรายละเอียด
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {dayStickers.map((st) => (
            <span key={st.id} className="text-base" title={st.name}>
              {st.emoji}
            </span>
          ))}
          {!isViewOnly && (
            <button
              type="button"
              onClick={() => onOpenStickers(dateKey)}
              className="px-2 py-1 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>แปะสติ๊กเกอร์</span>
            </button>
          )}
        </div>
      </div>

      {/* Holiday & Wan Phra Information Banner (Shown when viewing details) */}
      {(specialInfo.isHoliday || specialInfo.isWanPhra) && (
        <div className="mb-3 space-y-1.5 animate-in fade-in duration-150">
          {specialInfo.isHoliday && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/60 text-red-800 dark:text-red-200">
              <span className="text-base leading-none">🚩</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-red-700 dark:text-red-300">
                    วันหยุดราชการ: {specialInfo.holidayName}
                  </span>
                  {specialInfo.isSubstitution && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-red-100 dark:bg-red-900/70 text-red-700 dark:text-red-200 font-medium">
                      วันหยุดชดเชย
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
          {specialInfo.isWanPhra && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200">
              <span className="text-base leading-none">🪷</span>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  {specialInfo.wanPhraDescription}
                </span>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 ml-1.5">
                  (วันธรรมสวนะ)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3 Slots: Morning, Afternoon, Evening (Vertical layout, Pastel Colors, No black) */}
      <div className="space-y-2.5">
        {slots.map(({ key, title, timeRange, config }) => {
          const slotEvents = filterEventsBySlot(events, dateKey, key);
          const hasEvent = slotEvents.length > 0;

          return (
            <div
              key={key}
              onClick={() => {
                if (!hasEvent && !isViewOnly) {
                  onAddEvent(dateKey, key);
                }
              }}
              title={
                !hasEvent && !isViewOnly
                  ? `ช่วง${title} ว่าง - แตะเพื่อเพิ่มนัดหมาย`
                  : undefined
              }
              className={`rounded-xl border transition-all p-3 ${
                hasEvent
                  ? `${config.activeBg} ${config.activeBorder} ${config.activeText} shadow-xs`
                  : `${config.emptyBg} ${config.emptyBorder} ${config.emptyText} cursor-pointer hover:border-amber-400 hover:ring-1 hover:ring-amber-300 dark:hover:ring-amber-600`
              }`}
            >
              {/* Slot Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-current opacity-80" />
                  <span className="text-xs sm:text-sm font-bold">{title}</span>
                  <span className="text-[10px] sm:text-xs opacity-75">({timeRange})</span>
                </div>

                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddEvent(dateKey, key);
                    }}
                    className="px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors bg-white/90 hover:bg-white text-stone-800 shadow-2xs border border-stone-200/60"
                  >
                    <Plus className="w-3 h-3" />
                    <span>เพิ่มนัด</span>
                  </button>
                )}
              </div>

              {/* Slot Event List or Empty state */}
              {hasEvent ? (
                <div className="space-y-1.5 mt-2">
                  {slotEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onEventClick(ev)}
                      className="p-2.5 rounded-lg bg-white/90 hover:bg-white text-stone-900 border border-white/70 shadow-2xs cursor-pointer transition-all flex items-start justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ev.sticker && (
                            <span className="text-sm shrink-0">{ev.sticker}</span>
                          )}
                          <span className="text-xs font-bold text-stone-900">{ev.title}</span>
                          {ev.slots && ev.slots.length > 1 && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-semibold border border-amber-200">
                              หลายช่วงเวลา
                            </span>
                          )}
                          {ev.isGoogleEvent && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-blue-600/80 text-white font-medium">
                              Google
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-600 mt-0.5">
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-stone-400" />
                            {ev.startTime} - {ev.endTime} น.
                          </span>
                          {ev.location && (
                            <span className="flex items-center gap-1 truncate max-w-[140px] text-stone-500">
                              <MapPin className="w-3 h-3 text-stone-400" />
                              {ev.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-stone-400 shrink-0 self-center" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between py-1 text-[11px] opacity-75 hover:opacity-100 transition-opacity">
                  <p>ยังไม่มีกำหนดการในช่วงเวลานี้</p>
                  {!isViewOnly && (
                    <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600 dark:text-amber-400 text-xs">
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                      <span>แตะเพื่อเพิ่มนัด</span>
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
