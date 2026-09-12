import React from 'react';
import { CalendarEvent, ThemeConfig, TimeSlot } from '../types';
import { formatThaiDate } from '../utils/dateUtils';
import { X, Plus, Clock, MapPin, Calendar as CalendarIcon, Edit3 } from 'lucide-react';

interface SlotListModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  slot: TimeSlot;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNewEvent: (dateKey: string, slot: TimeSlot) => void;
  onEditEvent?: (event: CalendarEvent) => void;
  theme: ThemeConfig;
  isViewOnly: boolean;
}

export const SlotListModal: React.FC<SlotListModalProps> = ({
  isOpen,
  onClose,
  dateKey,
  slot,
  events,
  onSelectEvent,
  onAddNewEvent,
  onEditEvent,
  theme,
  isViewOnly,
}) => {
  if (!isOpen) return null;

  const slotConfig =
    slot === 'morning'
      ? theme.slots.morning
      : slot === 'afternoon'
      ? theme.slots.afternoon
      : theme.slots.evening;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="slot-list-modal"
        className={`relative w-full max-w-md rounded-2xl border shadow-xl p-6 transition-all ${
          theme.cardBg
        } ${theme.cardBorder} ${theme.textColor}`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500" />
            <div>
              <h3 className="text-base font-bold">
                {slotConfig.nameTh} ({slotConfig.timeRange})
              </h3>
              <p className="text-xs text-stone-500">{formatThaiDate(dateKey)}</p>
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

        {/* List of events in this slot */}
        <div className="py-4 space-y-2.5 max-h-72 overflow-y-auto">
          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => {
                onSelectEvent(ev);
                onClose();
              }}
              className="p-3 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-stone-800/80 cursor-pointer transition-all flex items-start justify-between group"
            >
              <div className="space-y-1">
                <h4 className="text-sm font-semibold group-hover:text-amber-600 transition-colors flex items-center gap-1.5 flex-wrap">
                  {ev.sticker && <span>{ev.sticker}</span>}
                  <span>{ev.title}</span>
                  {ev.slots && ev.slots.length > 1 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-normal">
                      หลายช่วงเวลา
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2 text-xs text-stone-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {ev.startTime} - {ev.endTime} น.
                  </span>
                  {ev.location && (
                    <>
                      <span>•</span>
                      <span className="truncate max-w-[150px]">{ev.location}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {ev.isGoogleEvent && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-medium shrink-0">
                    Google
                  </span>
                )}
                {!isViewOnly && onEditEvent && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditEvent(ev);
                      onClose();
                    }}
                    title="แก้ไขนัดหมาย"
                    className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 hover:bg-amber-100/60 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
          {!isViewOnly ? (
            <button
              type="button"
              onClick={() => {
                onAddNewEvent(dateKey, slot);
                onClose();
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              เพิ่มนัดหมายช่วงนี้
            </button>
          ) : (
            <div></div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
