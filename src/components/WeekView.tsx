import React from 'react';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { formatDateKey, formatThaiDate, THAI_FULL_DAYS, filterEventsBySlot } from '../utils/dateUtils';
import { Sparkles, Clock } from 'lucide-react';

interface WeekViewProps {
  currentDate: Date;
  theme: ThemeConfig;
  events: CalendarEvent[];
  stickers: StickerPlacement[];
  isViewOnly: boolean;
  onSlotClick: (dateKey: string, slot: TimeSlot, events: CalendarEvent[]) => void;
  onAddEvent?: (dateKey: string, slot?: TimeSlot) => void;
  onOpenStickers: (dateKey: string, slot?: TimeSlot) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  currentDate,
  theme,
  events,
  stickers,
  isViewOnly,
  onSlotClick,
  onOpenStickers,
  onEventClick,
}) => {
  // Get Sunday of current week
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    const today = new Date();
    const isToday = key === formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());
    return {
      dateObj: d,
      dateKey: key,
      dayName: THAI_FULL_DAYS[i],
      dayNumber: d.getDate(),
      isToday,
    };
  });

  const slotsConfig: Array<{ key: TimeSlot; conf: typeof theme.slots.morning }> = [
    { key: 'morning', conf: theme.slots.morning },
    { key: 'afternoon', conf: theme.slots.afternoon },
    { key: 'evening', conf: theme.slots.evening },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-2.5 py-1">
      {weekDays.map((day) => {
        const dayStickers = stickers.filter((s) => s.date === day.dateKey);

        return (
          <div
            key={day.dateKey}
            className={`flex flex-col rounded-2xl border p-2.5 transition-all ${theme.cardBg} ${
              day.isToday ? 'ring-2 ring-amber-500 shadow-md' : theme.cardBorder
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2">
              <div>
                <span className="text-[11px] font-semibold text-stone-400 block leading-tight">
                  {day.dayName}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                      day.isToday ? 'bg-amber-500 text-white' : theme.textColor
                    }`}
                  >
                    {day.dayNumber}
                  </span>
                  {day.isToday && (
                    <span className="text-[9px] text-amber-600 font-bold">วันนี้</span>
                  )}
                </div>
              </div>

              {/* Day Stickers */}
              <div className="flex items-center gap-1">
                {dayStickers.map((s) => (
                  <span key={s.id} className="text-sm" title={s.name}>
                    {s.emoji}
                  </span>
                ))}
                {!isViewOnly && (
                  <button
                    type="button"
                    onClick={() => onOpenStickers(day.dateKey)}
                    title="แปะสติ๊กเกอร์"
                    className="p-1 rounded text-stone-400 hover:text-stone-700 transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 3 Vertical Slots */}
            <div className="flex flex-col gap-1.5 flex-1">
              {slotsConfig.map(({ key: slotKey, conf }) => {
                const slotEvents = filterEventsBySlot(events, day.dateKey, slotKey);
                const hasEvent = slotEvents.length > 0;

                return (
                  <div
                    key={slotKey}
                    onClick={() => {
                      if (hasEvent) {
                        onSlotClick(day.dateKey, slotKey, slotEvents);
                      }
                    }}
                    className={`rounded-xl border p-2 flex flex-col justify-between transition-all min-h-[64px] ${
                      hasEvent
                        ? `${conf.activeBg} ${conf.activeBorder} ${conf.activeText} shadow-2xs cursor-pointer`
                        : `${conf.emptyBg} ${conf.emptyBorder} opacity-75`
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[10px] font-bold opacity-80">{conf.nameTh}</span>
                      <span className="text-[9px] opacity-60">{conf.timeRange}</span>
                    </div>

                    {hasEvent ? (
                      <div className="space-y-1">
                        {slotEvents.map((ev) => (
                          <div
                            key={ev.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(ev);
                            }}
                            className="bg-white/90 text-stone-900 border border-white/70 shadow-2xs rounded-md p-1 px-1.5 text-[11px] font-medium truncate hover:bg-white flex items-center gap-1"
                          >
                            <Clock className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            <span className="font-semibold text-[10px]">{ev.startTime}</span>
                            {ev.sticker && <span className="shrink-0">{ev.sticker}</span>}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-2" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
