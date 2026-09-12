import React, { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, X, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { CalendarEvent, FriendUser, ThemeConfig } from '../types';
import { getSharedEvents } from '../services/firestoreService';

interface CompareScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  friend: FriendUser | null;
  myEvents: CalendarEvent[];
  friendEvents: CalendarEvent[];
  theme: ThemeConfig;
  currentDate: Date;
}

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export const CompareScheduleModal: React.FC<CompareScheduleModalProps> = ({
  isOpen,
  onClose,
  friend,
  myEvents,
  friendEvents,
  theme,
  currentDate,
}) => {
  const [viewMonth, setViewMonth] = useState(new Date(currentDate));
  const [loadedFriendEvents, setLoadedFriendEvents] = useState<CalendarEvent[]>(friendEvents);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  useEffect(() => {
    if (isOpen && friend) {
      if (friendEvents && friendEvents.length > 0) {
        setLoadedFriendEvents(friendEvents);
      } else {
        setIsLoadingEvents(true);
        getSharedEvents(friend.friendUid)
          .then((evts) => {
            setLoadedFriendEvents(evts);
          })
          .catch((err) => {
            console.warn('Compare getSharedEvents error:', err);
          })
          .finally(() => {
            setIsLoadingEvents(false);
          });
      }
    }
  }, [isOpen, friend, friendEvents]);

  if (!isOpen || !friend) return null;

  const activeFriendEvents = loadedFriendEvents.length > 0 ? loadedFriendEvents : friendEvents;

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Helper to check if a specific slot on date has events
  const hasEventInSlot = (events: CalendarEvent[], dateStr: string, slotName: 'morning' | 'afternoon' | 'evening') => {
    return events.some(
      (e) => e.date === dateStr && (e.slot === slotName || (e.slots && e.slots.includes(slotName)))
    );
  };

  // Calculate mutual free slots for each day
  interface DayComparison {
    dateStr: string;
    dayNum: number;
    dayOfWeek: number;
    slots: {
      slotKey: 'morning' | 'afternoon' | 'evening';
      label: string;
      timeRange: string;
      myFree: boolean;
      friendFree: boolean;
      bothFree: boolean;
    }[];
    bothFreeCount: number;
  }

  const comparisonDays: DayComparison[] = [];
  let totalMutualFreeSlots = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayOfWeek = d.getDay();

    const morningMyBusy = hasEventInSlot(myEvents, dateStr, 'morning');
    const morningFriendBusy = hasEventInSlot(activeFriendEvents, dateStr, 'morning');
    const morningBothFree = !morningMyBusy && !morningFriendBusy;

    const afternoonMyBusy = hasEventInSlot(myEvents, dateStr, 'afternoon');
    const afternoonFriendBusy = hasEventInSlot(activeFriendEvents, dateStr, 'afternoon');
    const afternoonBothFree = !afternoonMyBusy && !afternoonFriendBusy;

    const eveningMyBusy = hasEventInSlot(myEvents, dateStr, 'evening');
    const eveningFriendBusy = hasEventInSlot(activeFriendEvents, dateStr, 'evening');
    const eveningBothFree = !eveningMyBusy && !eveningFriendBusy;

    const slots: DayComparison['slots'] = [
      {
        slotKey: 'morning',
        label: 'เช้า',
        timeRange: '06:00 - 12:00',
        myFree: !morningMyBusy,
        friendFree: !morningFriendBusy,
        bothFree: morningBothFree,
      },
      {
        slotKey: 'afternoon',
        label: 'บ่าย',
        timeRange: '12:00 - 17:00',
        myFree: !afternoonMyBusy,
        friendFree: !afternoonFriendBusy,
        bothFree: afternoonBothFree,
      },
      {
        slotKey: 'evening',
        label: 'เย็น',
        timeRange: '17:00 - 24:00',
        myFree: !eveningMyBusy,
        friendFree: !eveningFriendBusy,
        bothFree: eveningBothFree,
      },
    ];

    const bothFreeCount = slots.filter((s) => s.bothFree).length;
    totalMutualFreeSlots += bothFreeCount;

    comparisonDays.push({
      dateStr,
      dayNum: day,
      dayOfWeek,
      slots,
      bothFreeCount,
    });
  }

  const handlePrevMonth = () => {
    setViewMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setViewMonth(new Date(year, month + 1, 1));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/50 backdrop-blur-xs overflow-y-auto"
    >
      <div
        className={`w-full max-w-2xl rounded-2xl border shadow-xl flex flex-col max-h-[90vh] ${theme.cardBg} ${theme.cardBorder}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-2xs">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="compare-modal-title" className="text-base font-bold text-stone-900">
                เปรียบเทียบเวลาว่างกับ {friend.displayName}
              </h2>
              <p className="text-xs text-stone-500">
                ค้นหาช่วงเวลา 3 ช่วงเวลา (เช้า, บ่าย, เย็น) ที่คุณและเพื่อนว่างตรงกัน
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

        {/* Month Selector & Summary */}
        <div className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold text-stone-800">
              {MONTH_NAMES_TH[month]} {year + 543}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-stone-200 text-stone-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              ว่างตรงกัน {totalMutualFreeSlots} ช่วงเวลา
            </span>
          </div>
        </div>

        {/* Days List */}
        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
          {comparisonDays.map((day) => {
            const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
            const dayNames = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

            return (
              <div
                key={day.dateStr}
                className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                  day.bothFreeCount > 0
                    ? 'bg-white border-stone-200 shadow-2xs'
                    : 'bg-stone-50/50 border-stone-200/60 opacity-75'
                }`}
              >
                {/* Date label */}
                <div className="flex items-center gap-2 min-w-28">
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                      isWeekend ? 'bg-rose-100 text-rose-700' : 'bg-stone-100 text-stone-800'
                    }`}
                  >
                    {day.dayNum}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-stone-800">
                      {dayNames[day.dayOfWeek]} {day.dayNum} {MONTH_NAMES_TH[month].slice(0, 4)}
                    </span>
                    <p className="text-[10px] text-stone-400">
                      {day.bothFreeCount > 0
                        ? `ว่างตรงกัน ${day.bothFreeCount} ช่วง`
                        : 'ไม่มีเวลาว่างตรงกัน'}
                    </p>
                  </div>
                </div>

                {/* 3 Slots Chips */}
                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  {day.slots.map((s) => (
                    <div
                      key={s.slotKey}
                      className={`flex-1 max-w-[120px] px-2 py-1.5 rounded-lg border text-center text-[10px] transition-all ${
                        s.bothFree
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold shadow-2xs'
                          : s.myFree && !s.friendFree
                          ? 'bg-amber-50/70 border-amber-200 text-amber-800 font-medium'
                          : !s.myFree && s.friendFree
                          ? 'bg-blue-50/70 border-blue-200 text-blue-800 font-medium'
                          : 'bg-stone-100 border-stone-200 text-stone-400 line-through'
                      }`}
                      title={
                        s.bothFree
                          ? `ช่วง${s.label}: คุณและ ${friend.displayName} ว่างตรงกัน!`
                          : s.myFree
                          ? `ช่วง${s.label}: คุณว่าง แต่ ${friend.displayName} มีนัด`
                          : s.friendFree
                          ? `ช่วง${s.label}: ${friend.displayName} ว่าง แต่คุณมีนัด`
                          : `ช่วง${s.label}: ทั้งคู่มีนัด`
                      }
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>{s.label}</span>
                        {s.bothFree && <span className="text-[9px]">✨</span>}
                      </div>
                      <span className="text-[9px] block">
                        {s.bothFree
                          ? 'ว่างตรงกัน'
                          : s.myFree
                          ? 'เพื่อนมีนัด'
                          : s.friendFree
                          ? 'เรามีนัด'
                          : 'ไม่ว่างทั้งคู่'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-200 flex items-center justify-between bg-stone-50/50 rounded-b-2xl">
          <div className="flex items-center gap-3 text-[11px] text-stone-500">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-300 border border-emerald-400" />
              ว่างตรงกัน
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-stone-200 border border-stone-300" />
              มีนัดหมาย
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-medium transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
