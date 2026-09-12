import React, { useState, useEffect } from 'react';
import { CalendarEvent, ThemeConfig, TimeSlot } from '../types';
import { formatThaiDate, calculateSlotsForTimeRange } from '../utils/dateUtils';
import { STICKER_CATEGORIES } from '../constants/stickers';
import {
  X,
  Clock,
  MapPin,
  AlignLeft,
  Calendar as CalendarIcon,
  Check,
  AlertCircle,
  Smile,
  Sparkles,
  Edit3,
} from 'lucide-react';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    eventData: Omit<CalendarEvent, 'id'>,
    syncToGoogle: boolean
  ) => Promise<void>;
  onUpdate?: (
    eventId: string,
    eventData: Partial<CalendarEvent>,
    syncToGoogle: boolean
  ) => Promise<void>;
  initialDate?: string;
  initialSlot?: TimeSlot;
  editingEvent?: CalendarEvent | null;
  theme: ThemeConfig;
  isSignedInWithGoogle: boolean;
}

// Popular quick-pick stickers for events
const QUICK_STICKERS = [
  { emoji: '💼', label: 'งาน' },
  { emoji: '🏥', label: 'สุขภาพ' },
  { emoji: '🎂', label: 'วันเกิด' },
  { emoji: '✈️', label: 'เดินทาง' },
  { emoji: '🍽️', label: 'ทานข้าว' },
  { emoji: '🏃', label: 'ออกกำลัง' },
  { emoji: '💻', label: 'ประชุม' },
  { emoji: '☕', label: 'คาเฟ่' },
  { emoji: '⭐', label: 'สำคัญ' },
  { emoji: '❤️', label: 'คนพิเศษ' },
  { emoji: '🛒', label: 'ช้อปปิ้ง' },
  { emoji: '🚗', label: 'ขับรถ' },
  { emoji: '📚', label: 'เรียน' },
  { emoji: '📌', label: 'ปักหมุด' },
];

export const AddEventModal: React.FC<AddEventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  initialDate,
  initialSlot = 'morning' as TimeSlot,
  editingEvent = null,
  theme,
  isSignedInWithGoogle,
}) => {
  const [title, setTitle] = useState('');
  const [selectedSticker, setSelectedSticker] = useState<string>('');
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [date, setDate] = useState('');
  const [selectedSlots, setSelectedSlots] = useState<TimeSlot[]>([initialSlot]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [syncToGoogle, setSyncToGoogle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Default time range for a slot
  const getDefaultTimesForSlot = (s: TimeSlot) => {
    switch (s) {
      case 'morning':
        return { start: '09:00', end: '11:00' };
      case 'afternoon':
        return { start: '13:30', end: '15:30' };
      case 'evening':
        return { start: '18:00', end: '20:00' };
      default:
        return { start: '09:00', end: '10:30' };
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (editingEvent) {
        setDate(editingEvent.date);
        const currentSlots =
          editingEvent.slots && editingEvent.slots.length > 0
            ? editingEvent.slots
            : [editingEvent.slot];
        setSelectedSlots(currentSlots);
        setStartTime(editingEvent.startTime);
        setEndTime(editingEvent.endTime);
        setTitle(editingEvent.title);
        setSelectedSticker(editingEvent.sticker || '');
        setIsStickerPickerOpen(false);
        setLocation(editingEvent.location || '');
        setDescription(editingEvent.description || '');
        setErrorMsg('');
        setSyncToGoogle(
          Boolean(editingEvent.isGoogleEvent || editingEvent.googleEventId || isSignedInWithGoogle)
        );
      } else {
        const todayStr = initialDate || new Date().toISOString().split('T')[0];
        const startSlot: TimeSlot = initialSlot || 'morning';
        setDate(todayStr);
        setSelectedSlots([startSlot]);
        const defTime = getDefaultTimesForSlot(startSlot);
        setStartTime(defTime.start);
        setEndTime(defTime.end);
        setTitle('');
        setSelectedSticker('');
        setIsStickerPickerOpen(false);
        setLocation('');
        setDescription('');
        setErrorMsg('');
        setSyncToGoogle(isSignedInWithGoogle);
      }
    }
  }, [isOpen, initialDate, initialSlot, editingEvent, isSignedInWithGoogle]);

  // Handle manual slot toggling (supports multi-select)
  const handleToggleSlot = (s: TimeSlot) => {
    let updated: TimeSlot[];
    if (selectedSlots.includes(s)) {
      if (selectedSlots.length === 1) {
        // Keep at least one slot
        return;
      }
      updated = selectedSlots.filter((item) => item !== s);
    } else {
      updated = [...selectedSlots, s];
    }
    setSelectedSlots(updated);

    // Update times to cover the newly selected slots
    if (updated.includes('morning') && updated.includes('afternoon') && updated.includes('evening')) {
      setStartTime('09:00');
      setEndTime('20:00');
    } else if (updated.includes('morning') && updated.includes('afternoon')) {
      setStartTime('09:00');
      setEndTime('15:00');
    } else if (updated.includes('afternoon') && updated.includes('evening')) {
      setStartTime('13:00');
      setEndTime('20:00');
    } else if (updated.length === 1) {
      const defTime = getDefaultTimesForSlot(updated[0]);
      setStartTime(defTime.start);
      setEndTime(defTime.end);
    }
  };

  // When start or end time changes, automatically detect and select all slots spanned
  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    const autoSlots = calculateSlotsForTimeRange(newStart, endTime);
    setSelectedSlots(autoSlots);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    const autoSlots = calculateSlotsForTimeRange(startTime, newEnd);
    setSelectedSlots(autoSlots);
  };

  const handleSelectSticker = (emoji: string) => {
    setSelectedSticker((prev) => (prev === emoji ? '' : emoji));
    setIsStickerPickerOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณาระบุชื่องานหรือนัดหมาย');
      return;
    }
    if (startTime >= endTime) {
      setErrorMsg('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่มต้น');
      return;
    }

    const slotsToSave = selectedSlots.length > 0 ? selectedSlots : ['morning' as TimeSlot];
    const primarySlot = slotsToSave[0];

    setErrorMsg('');
    setIsSubmitting(true);
    try {
      if (editingEvent && onUpdate) {
        await onUpdate(
          editingEvent.id,
          {
            title: title.trim(),
            sticker: selectedSticker ? selectedSticker : undefined,
            description: description.trim(),
            location: location.trim(),
            date,
            slot: primarySlot,
            slots: slotsToSave,
            startTime,
            endTime,
          },
          syncToGoogle
        );
      } else {
        await onSave(
          {
            title: title.trim(),
            sticker: selectedSticker ? selectedSticker : undefined,
            description: description.trim(),
            location: location.trim(),
            date,
            slot: primarySlot,
            slots: slotsToSave,
            startTime,
            endTime,
          },
          syncToGoogle
        );
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกนัดหมาย');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="add-event-modal"
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl border border-stone-200 shadow-2xl bg-white text-stone-900 overflow-hidden"
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-stone-200 shrink-0 bg-white">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 text-stone-900">
              {editingEvent ? (
                <>
                  <Edit3 className="w-5 h-5 text-amber-500" />
                  แก้ไขนัดหมาย
                </>
              ) : (
                <>
                  <CalendarIcon className="w-5 h-5 text-amber-500" />
                  ลงนัดหมายใหม่
                </>
              )}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {formatThaiDate(date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Body and Sticky Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-3.5 sm:px-5 sm:py-4 space-y-3 sm:space-y-3.5">
            {errorMsg && (
              <div className="p-2.5 text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title with Sticker in Front */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">
                  ชื่องาน / การนัดหมาย *
                </label>
                <span className="text-[11px] text-stone-500">
                  แตะไอคอนเพื่อแปะสติ๊กเกอร์ก่อนชื่องาน
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Sticker Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsStickerPickerOpen((prev) => !prev)}
                  title="แปะสติ๊กเกอร์ก่อนชื่องาน"
                  className={`h-10 px-3 rounded-xl border flex items-center gap-1 text-base transition-colors shrink-0 ${
                    selectedSticker
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                      : 'bg-stone-50 hover:bg-stone-100 border-stone-300 text-stone-600'
                  }`}
                >
                  {selectedSticker ? (
                    <>
                      <span>{selectedSticker}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedSticker('');
                        }}
                        className="text-[10px] text-stone-400 hover:text-stone-700 ml-0.5"
                        title="ลบสติ๊กเกอร์"
                      >
                        ✕
                      </span>
                    </>
                  ) : (
                    <>
                      <Smile className="w-4 h-4 text-stone-400" />
                      <span className="text-xs font-medium text-stone-500">สติ๊กเกอร์</span>
                    </>
                  )}
                </button>

                {/* Title Input */}
                <input
                  id="event-title-input"
                  type="text"
                  required
                  placeholder="เช่น ประชุมวางแผนงาน, นัดหมอฟัน, ดินเนอร์"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="flex-1 h-10 px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium placeholder:text-stone-400 text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
                  autoFocus
                />
              </div>

              {/* Quick Stickers Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 mt-1 no-scrollbar">
                <span className="text-[10px] text-stone-400 shrink-0 flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                  สติ๊กเกอร์ด่วน:
                </span>
                {QUICK_STICKERS.map((qs) => (
                  <button
                    key={qs.emoji}
                    type="button"
                    onClick={() => handleSelectSticker(qs.emoji)}
                    className={`px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 border transition-all shrink-0 ${
                      selectedSticker === qs.emoji
                        ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-2xs'
                        : 'bg-stone-100/70 hover:bg-stone-200/70 border-stone-200 text-stone-700'
                    }`}
                  >
                    <span>{qs.emoji}</span>
                    <span className="text-[10px]">{qs.label}</span>
                  </button>
                ))}
              </div>

              {/* Expanded Sticker Picker Popover (All Categories) */}
              {isStickerPickerOpen && (
                <div className="mt-2 p-3 rounded-xl border border-stone-200 bg-stone-50 space-y-2.5 shadow-sm max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between pb-1 border-b border-stone-200">
                    <span className="text-xs font-bold text-stone-700">เลือกสติ๊กเกอร์สำหรับงานนี้</span>
                    {selectedSticker && (
                      <button
                        type="button"
                        onClick={() => setSelectedSticker('')}
                        className="text-[11px] text-rose-600 hover:underline"
                      >
                        ลบสติ๊กเกอร์
                      </button>
                    )}
                  </div>
                  {STICKER_CATEGORIES.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-semibold text-stone-500 mb-1">
                        {cat.nameTh}
                      </p>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5">
                        {cat.stickers.map((st) => (
                          <button
                            key={st.emoji}
                            type="button"
                            onClick={() => handleSelectSticker(st.emoji)}
                            title={st.name}
                            className={`p-1.5 rounded-lg text-lg text-center hover:scale-110 transition-transform ${
                              selectedSticker === st.emoji
                                ? 'bg-amber-200 ring-2 ring-amber-400'
                                : 'hover:bg-stone-200'
                            }`}
                          >
                            {st.emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                วันที่
              </label>
              <input
                id="event-date-input"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
              />
            </div>

            {/* Slot Selection Buttons (Multi-select support with pastel colors) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-stone-700">
                  ช่วงเวลา (เลือกได้หลายช่วง หรือระบบจะเลือกให้อัตโนมัติตามเวลา)
                </label>
                <span className="text-[10px] text-stone-500">
                  {selectedSlots.length > 1 ? `เลือกแล้ว ${selectedSlots.length} ช่วง` : ''}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {/* Morning (ฟ้าพาสเทล) */}
                <button
                  type="button"
                  id="select-slot-morning"
                  onClick={() => handleToggleSlot('morning')}
                  className={`py-2 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    selectedSlots.includes('morning')
                      ? 'bg-[#bae6fd] border-[#7dd3fc] text-[#082f49] shadow-xs font-bold ring-2 ring-[#0284c7]'
                      : 'bg-[#e0f2fe]/60 border-[#bae6fd]/60 text-[#0369a1] hover:bg-[#e0f2fe]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {selectedSlots.includes('morning') && (
                      <Check className="w-3 h-3 text-[#0369a1] stroke-[3]" />
                    )}
                    <span className="text-xs font-semibold">ช่วงเช้า</span>
                  </div>
                  <span className="text-[10px] opacity-75">06:00-12:00</span>
                </button>

                {/* Afternoon (ส้มพาสเทล) */}
                <button
                  type="button"
                  id="select-slot-afternoon"
                  onClick={() => handleToggleSlot('afternoon')}
                  className={`py-2 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    selectedSlots.includes('afternoon')
                      ? 'bg-[#fed7aa] border-[#fdba74] text-[#431407] shadow-xs font-bold ring-2 ring-[#ea580c]'
                      : 'bg-[#ffedd5]/60 border-[#fed7aa]/60 text-[#c2410c] hover:bg-[#ffedd5]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {selectedSlots.includes('afternoon') && (
                      <Check className="w-3 h-3 text-[#c2410c] stroke-[3]" />
                    )}
                    <span className="text-xs font-semibold">ช่วงบ่าย</span>
                  </div>
                  <span className="text-[10px] opacity-75">12:00-17:00</span>
                </button>

                {/* Evening (ชมพูพาสเทล) */}
                <button
                  type="button"
                  id="select-slot-evening"
                  onClick={() => handleToggleSlot('evening')}
                  className={`py-2 px-2 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                    selectedSlots.includes('evening')
                      ? 'bg-[#fbcfe8] border-[#f472b6] text-[#500724] shadow-xs font-bold ring-2 ring-[#db2777]'
                      : 'bg-[#fce7f3]/60 border-[#fbcfe8]/60 text-[#be185d] hover:bg-[#fce7f3]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {selectedSlots.includes('evening') && (
                      <Check className="w-3 h-3 text-[#be185d] stroke-[3]" />
                    )}
                    <span className="text-xs font-semibold">ช่วงเย็น</span>
                  </div>
                  <span className="text-[10px] opacity-75">17:00-24:00</span>
                </button>
              </div>
            </div>

            {/* Detailed Times (Auto-detects slots when times overlap) */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  เวลาเริ่ม
                </label>
                <input
                  id="event-start-time"
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  เวลาสิ้นสุด
                </label>
                <input
                  id="event-end-time"
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => handleEndTimeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-500" />
                สถานที่ (ถ้ามี)
              </label>
              <input
                id="event-location"
                type="text"
                placeholder="เช่น ห้องประชุม 2, สยามพารากอน, Google Meet"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium placeholder:text-stone-400 text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
                <AlignLeft className="w-3.5 h-3.5 text-stone-500" />
                หมายเหตุ / รายละเอียด
              </label>
              <textarea
                id="event-description"
                rows={2}
                placeholder="บันทึกรายละเอียดเพิ่มเติม..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100/60 focus:bg-white text-stone-900 font-medium placeholder:text-stone-400 text-sm focus:outline-hidden focus:border-stone-500 focus:ring-2 focus:ring-stone-200 transition-colors resize-none"
              />
            </div>

            {/* Google Calendar Sync Option */}
            <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center shadow-2xs">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-stone-800">ซิงค์ไปยัง Google Calendar</p>
                  <p className="text-[11px] text-stone-500">
                    {isSignedInWithGoogle
                      ? 'เชื่อมต่อแล้ว นัดหมายจะส่งเข้า Google Calendar'
                      : 'ยังไม่ได้เข้าสู่ระบบ จะบันทึกไว้ในแอพ'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={syncToGoogle && isSignedInWithGoogle}
                  disabled={!isSignedInWithGoogle}
                  onChange={(e) => setSyncToGoogle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-stone-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
          </div>

          {/* Sticky Bottom Footer */}
          <div className="flex items-center justify-end gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-stone-200 bg-stone-50/90 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              id="confirm-add-event-button"
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer ${theme.primaryBtn}`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingEvent ? 'บันทึกการแก้ไข' : 'บันทึกการนัดหมาย'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
