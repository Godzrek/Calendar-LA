import React from 'react';
import { CalendarEvent, StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { THAI_DAYS, MonthDayInfo } from '../utils/dateUtils';
import { SlotDayCell } from './SlotDayCell';

interface MonthViewProps {
  days: MonthDayInfo[];
  theme: ThemeConfig;
  events: CalendarEvent[];
  stickers: StickerPlacement[];
  isViewOnly: boolean;
  selectedDateKey?: string;
  onDaySelect?: (dateKey: string) => void;
  onSlotClick: (dateKey: string, slot: TimeSlot, events: CalendarEvent[]) => void;
  onAddEvent: (dateKey: string, slot?: TimeSlot) => void;
  onOpenStickers: (dateKey: string, slot?: TimeSlot) => void;
  onEventClick: (event: CalendarEvent) => void;
  onRemoveSticker: (stickerId: string) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  days,
  theme,
  events,
  stickers,
  isViewOnly,
  selectedDateKey,
  onDaySelect,
  onSlotClick,
  onAddEvent,
  onOpenStickers,
  onEventClick,
  onRemoveSticker,
}) => {
  return (
    <div className="flex flex-col space-y-1">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 gap-1 pb-1">
        {THAI_DAYS.map((dayName, idx) => (
          <div
            key={dayName}
            className={`text-center py-1 text-[11px] font-semibold rounded-md ${
              idx === 0
                ? 'text-rose-600'
                : idx === 6
                ? 'text-indigo-600'
                : 'text-stone-500'
            }`}
          >
            {dayName}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {days.map((day) => (
          <SlotDayCell
            key={day.dateKey}
            dateKey={day.dateKey}
            dayNumber={day.dayNumber}
            isCurrentMonth={day.isCurrentMonth}
            isToday={day.isToday}
            isSelected={selectedDateKey === day.dateKey}
            theme={theme}
            events={events}
            stickers={stickers}
            isViewOnly={isViewOnly}
            onDaySelect={onDaySelect}
            onSlotClick={onSlotClick}
            onAddEvent={onAddEvent}
            onOpenStickers={onOpenStickers}
            onEventClick={onEventClick}
            onRemoveSticker={onRemoveSticker}
          />
        ))}
      </div>
    </div>
  );
};
