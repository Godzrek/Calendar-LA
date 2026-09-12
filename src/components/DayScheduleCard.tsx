import React from 'react';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { formatThaiDate, filterEventsBySlot } from '../utils/dateUtils';
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

  return (
    <div
      id="mobile-day-schedule"
      className="mt-3 rounded-2xl border border-stone-200/80 bg-white p-3.5 sm:p-4 shadow-xs"
    >
      {/* Date Header */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <div>
            <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-tight">
              ตารางนัดหมาย: {formatThaiDate(dateKey)}
            </h3>
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
              className="px-2 py-1 rounded-lg text-xs font-medium bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 transition-colors"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>แปะสติ๊กเกอร์</span>
            </button>
          )}
        </div>
      </div>

      {/* 3 Slots: Morning, Afternoon, Evening (Vertical layout, Pastel Colors, No black) */}
      <div className="space-y-2.5">
        {slots.map(({ key, title, timeRange, config }) => {
          const slotEvents = filterEventsBySlot(events, dateKey, key);
          const hasEvent = slotEvents.length > 0;

          return (
            <div
              key={key}
              className={`rounded-xl border transition-all p-3 ${
                hasEvent
                  ? `${config.activeBg} ${config.activeBorder} ${config.activeText} shadow-xs`
                  : `${config.emptyBg} ${config.emptyBorder} ${config.emptyText}`
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
                    onClick={() => onAddEvent(dateKey, key)}
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
                <p className="text-[11px] opacity-70 py-0.5">
                  ยังไม่มีกำหนดการในช่วงเวลานี้
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
