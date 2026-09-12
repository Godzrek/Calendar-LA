import React from 'react';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { filterEventsBySlot } from '../utils/dateUtils';
import { getDaySpecialInfo } from '../utils/thaiHolidays';
import { Sparkles, Clock } from 'lucide-react';

interface SlotDayCellProps {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected?: boolean;
  theme: ThemeConfig;
  events: CalendarEvent[];
  stickers: StickerPlacement[];
  isViewOnly: boolean;
  onSlotClick: (dateKey: string, slot: TimeSlot, existingEvents: CalendarEvent[]) => void;
  onAddEvent?: (dateKey: string, slot?: TimeSlot) => void;
  onOpenStickers: (dateKey: string, slot?: TimeSlot) => void;
  onEventClick: (event: CalendarEvent) => void;
  onDaySelect?: (dateKey: string) => void;
  onRemoveSticker?: (stickerId: string) => void;
}

export const SlotDayCell: React.FC<SlotDayCellProps> = ({
  dateKey,
  dayNumber,
  isCurrentMonth,
  isToday,
  isSelected,
  theme,
  events,
  stickers,
  isViewOnly,
  onSlotClick,
  onOpenStickers,
  onEventClick,
  onDaySelect,
  onRemoveSticker,
}) => {
  const dayStickers = stickers.filter((s) => s.date === dateKey);

  const morningEvents = filterEventsBySlot(events, dateKey, 'morning');
  const afternoonEvents = filterEventsBySlot(events, dateKey, 'afternoon');
  const eveningEvents = filterEventsBySlot(events, dateKey, 'evening');

  const slotsData: Array<{
    slotKey: TimeSlot;
    events: CalendarEvent[];
    config: typeof theme.slots.morning;
  }> = [
    {
      slotKey: 'morning',
      events: morningEvents,
      config: theme.slots.morning,
    },
    {
      slotKey: 'afternoon',
      events: afternoonEvents,
      config: theme.slots.afternoon,
    },
    {
      slotKey: 'evening',
      events: eveningEvents,
      config: theme.slots.evening,
    },
  ];

  const specialInfo = getDaySpecialInfo(dateKey);
  const isHoliday = specialInfo.isHoliday && isCurrentMonth;
  const isWanPhra = specialInfo.isWanPhra && isCurrentMonth;

  return (
    <div
      id={`day-cell-${dateKey}`}
      onClick={() => onDaySelect?.(dateKey)}
      title={specialInfo.holidayName || specialInfo.wanPhraDescription || undefined}
      className={`group relative flex flex-col rounded-xl border p-1 sm:p-1.5 transition-all duration-150 min-h-[96px] sm:min-h-[135px] cursor-pointer ${
        !isCurrentMonth
          ? 'opacity-35 bg-stone-50/40'
          : isHoliday
          ? theme.isDark
            ? 'bg-stone-900 border-stone-700 shadow-xs'
            : 'bg-stone-200/90 border-stone-300 shadow-2xs'
          : theme.cardBg
      } ${
        isSelected
          ? 'ring-2 ring-amber-500 shadow-xs border-amber-400'
          : isToday
          ? 'ring-1.5 ring-amber-500 shadow-xs'
          : isHoliday
          ? 'border-stone-300/90'
          : theme.cardBorder
      } ${!isCurrentMonth ? '' : 'hover:border-stone-400'}`}
    >
      {/* Top Header: Day Number & Day-level Stickers / Indicators */}
      <div className="flex items-center justify-between pb-1 px-0.5">
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex items-center justify-center text-[11px] sm:text-xs font-semibold rounded-full h-5 w-5 sm:h-6 sm:w-6 transition-colors ${
              isToday
                ? 'bg-amber-500 text-white font-bold'
                : isSelected
                ? 'bg-amber-500 text-white font-bold'
                : isHoliday
                ? 'bg-red-500/15 text-red-600 dark:text-red-400 font-bold'
                : isCurrentMonth
                ? `${theme.textColor}`
                : `${theme.mutedText}`
            }`}
          >
            {dayNumber}
          </span>
          {isToday && (
            <span className="hidden md:inline-block text-[9px] font-medium text-amber-600">
              วันนี้
            </span>
          )}
          {isHoliday && (
            <span
              title={specialInfo.holidayName}
              className="text-[8px] font-bold px-1 py-0.2 rounded bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 leading-tight shrink-0 hidden sm:inline-block"
            >
              หยุด
            </span>
          )}
          {isWanPhra && (
            <span
              title={specialInfo.wanPhraDescription}
              className="text-[10px] leading-none shrink-0 select-none text-amber-600 dark:text-amber-400"
            >
              🪷
            </span>
          )}
        </div>

        {/* Sticker badges on header */}
        <div className="flex items-center gap-0.5">
          {dayStickers.slice(0, 2).map((st) => (
            <span
              key={st.id}
              title={st.name}
              onClick={(e) => {
                e.stopPropagation();
                if (!isViewOnly && onRemoveSticker) {
                  onRemoveSticker(st.id);
                }
              }}
              className="text-xs sm:text-sm select-none"
            >
              {st.emoji}
            </span>
          ))}
          {!isViewOnly && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenStickers(dateKey);
              }}
              title="แปะสติ๊กเกอร์"
              className="hidden sm:inline-flex opacity-0 group-hover:opacity-100 p-0.5 rounded text-stone-400 hover:text-stone-700 transition-all text-xs"
            >
              <Sparkles className="w-2.5 h-2.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3 Clean Stacked Time Slots (No emoji, no slot name labels, soft empty color) */}
      <div className="flex flex-col gap-1 flex-1">
        {slotsData.map(({ slotKey, events: slotEventsList, config }) => {
          const hasEvent = slotEventsList.length > 0;

          return (
            <div
              key={slotKey}
              id={`slot-${dateKey}-${slotKey}`}
              onClick={(e) => {
                e.stopPropagation();
                onDaySelect?.(dateKey);
                if (hasEvent) {
                  onSlotClick(dateKey, slotKey, slotEventsList);
                }
              }}
              className={`relative flex-1 min-h-[20px] sm:min-h-[26px] rounded-md sm:rounded-lg p-0.5 px-1 sm:px-1.5 flex items-center justify-between border text-[10px] sm:text-[11px] transition-all select-none ${
                hasEvent
                  ? `${config.activeBg} ${config.activeBorder} ${config.activeText} shadow-2xs font-medium cursor-pointer`
                  : `${config.emptyBg} ${config.emptyBorder} opacity-80 cursor-pointer hover:opacity-100`
              }`}
            >
              {hasEvent ? (
                <div className="flex items-center justify-between w-full min-w-0 gap-1">
                  <span className="truncate text-[9px] sm:text-[10px] font-semibold flex items-center gap-0.5">
                    {slotEventsList[0].sticker && (
                      <span className="shrink-0">{slotEventsList[0].sticker}</span>
                    )}
                    <span className="truncate">{slotEventsList[0].title}</span>
                  </span>
                  {slotEventsList.length > 1 && (
                    <span
                      className={`shrink-0 text-[8px] font-bold px-1 rounded-full ${config.activeBadge}`}
                    >
                      +{slotEventsList.length - 1}
                    </span>
                  )}
                </div>
              ) : (
                /* Empty slot: clean minimalistic strip with soft color */
                <span className="w-full h-1" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
