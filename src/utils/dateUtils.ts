import { CalendarEvent, TimeSlot } from '../types';

export const THAI_MONTHS = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

export const THAI_DAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
export const THAI_FULL_DAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];

export function formatYearThai(year: number): number {
  return year + 543;
}

export function formatDateKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseDateKey(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.split('-');
  return {
    year: parseInt(parts[0], 10),
    month: parseInt(parts[1], 10) - 1,
    day: parseInt(parts[2], 10),
  };
}

export function formatThaiDate(dateStr: string): string {
  const { year, month, day } = parseDateKey(dateStr);
  return `${day} ${THAI_MONTHS[month]} ${formatYearThai(year)}`;
}

export interface MonthDayInfo {
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dateObj: Date;
}

export function getCalendarGrid(year: number, month: number): MonthDayInfo[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const today = new Date();
  const todayKey = formatDateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const days: MonthDayInfo[] = [];

  // Previous month trailing days
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const key = formatDateKey(prevYear, prevMonth, day);
    days.push({
      dateKey: key,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: key === todayKey,
      dateObj: new Date(prevYear, prevMonth, day),
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const key = formatDateKey(year, month, day);
    days.push({
      dateKey: key,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: key === todayKey,
      dateObj: new Date(year, month, day),
    });
  }

  // Next month leading days to complete full weeks (up to 35 or 42)
  const remainingDays = 42 - days.length;
  if (remainingDays < 7) {
    // Fill until multiple of 7
    const count = (7 - (days.length % 7)) % 7;
    for (let day = 1; day <= count; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const key = formatDateKey(nextYear, nextMonth, day);
      days.push({
        dateKey: key,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dateObj: new Date(nextYear, nextMonth, day),
      });
    }
  } else {
    for (let day = 1; day <= remainingDays; day++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const key = formatDateKey(nextYear, nextMonth, day);
      days.push({
        dateKey: key,
        dayNumber: day,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dateObj: new Date(nextYear, nextMonth, day),
      });
    }
  }

  return days;
}

export function filterEventsBySlot(events: CalendarEvent[], dateKey: string, slot: TimeSlot): CalendarEvent[] {
  return events
    .filter((e) => {
      if (e.date !== dateKey) return false;
      if (e.slots && Array.isArray(e.slots) && e.slots.length > 0) {
        return e.slots.includes(slot);
      }
      return e.slot === slot;
    })
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
}

export function getDefaultTimeForSlot(slot: TimeSlot): { startTime: string; endTime: string } {
  switch (slot) {
    case 'morning':
      return { startTime: '09:00', endTime: '10:00' };
    case 'afternoon':
      return { startTime: '14:00', endTime: '15:00' };
    case 'evening':
      return { startTime: '18:30', endTime: '19:30' };
  }
}

export function categorizeTimeToSlot(timeStr: string): TimeSlot {
  if (!timeStr) return 'morning';
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10);
  if (isNaN(hour)) return 'morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * Automatically calculate which slots an event spans across [startTime, endTime].
 * Morning:   06:00 - 12:00
 * Afternoon: 12:00 - 17:00
 * Evening:   17:00 - 24:00 (and later)
 */
export function calculateSlotsForTimeRange(startTime: string, endTime: string): TimeSlot[] {
  if (!startTime || !endTime) return ['morning'];

  const toMinutes = (time: string): number => {
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
  };

  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  // If start is after or equal to end (e.g. overnight or instant), use start time slot
  if (start >= end) {
    return [categorizeTimeToSlot(startTime)];
  }

  const result: TimeSlot[] = [];

  // Morning window: starts before 12:00 (720 min) and overlaps period
  if (start < 720 && end > 0) {
    result.push('morning');
  }

  // Afternoon window: 12:00 to 17:00 (720 to 1020 min)
  if (start < 1020 && end > 720) {
    result.push('afternoon');
  }

  // Evening window: 17:00 onwards (1020 min onwards)
  if (end > 1020 || start >= 1020) {
    result.push('evening');
  }

  return result.length > 0 ? result : [categorizeTimeToSlot(startTime)];
}
