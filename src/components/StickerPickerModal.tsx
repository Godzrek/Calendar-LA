import React, { useState } from 'react';
import { STICKER_CATEGORIES } from '../constants/stickers';
import { StickerPlacement, ThemeConfig, TimeSlot } from '../types';
import { formatThaiDate } from '../utils/dateUtils';
import { X, Sparkles, Trash2 } from 'lucide-react';

interface StickerPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateKey: string;
  slot?: TimeSlot;
  existingStickers: StickerPlacement[];
  onAddSticker: (emoji: string, name: string, dateKey: string, slot?: TimeSlot) => void;
  onRemoveSticker: (stickerId: string) => void;
  theme: ThemeConfig;
}

export const StickerPickerModal: React.FC<StickerPickerModalProps> = ({
  isOpen,
  onClose,
  dateKey,
  slot,
  existingStickers,
  onAddSticker,
  onRemoveSticker,
  theme,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(STICKER_CATEGORIES[0].id);

  if (!isOpen) return null;

  const currentCategory =
    STICKER_CATEGORIES.find((c) => c.id === selectedCategory) || STICKER_CATEGORIES[0];

  const stickersOnThisDay = existingStickers.filter((s) => s.date === dateKey);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="sticker-picker-modal"
        className={`relative w-full max-w-lg rounded-2xl border shadow-xl p-6 transition-all ${
          theme.cardBg
        } ${theme.cardBorder} ${theme.textColor}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 text-lg">
              ✨
            </span>
            <div>
              <h3 className="text-base font-bold">แปะสติ๊กเกอร์บนปฏิทิน</h3>
              <p className="text-xs text-stone-500">
                สำหรับวันที่ {formatThaiDate(dateKey)}
              </p>
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

        {/* Existing stickers on this day */}
        {stickersOnThisDay.length > 0 && (
          <div className="my-3 p-3 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800">
            <p className="text-xs font-semibold mb-2 text-stone-500">
              สติ๊กเกอร์ที่แปะอยู่ในวันนี้ (คลิกถังขยะเพื่อเอาออก):
            </p>
            <div className="flex flex-wrap gap-2">
              {stickersOnThisDay.map((st) => (
                <div
                  key={st.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs shadow-2xs"
                >
                  <span className="text-base">{st.emoji}</span>
                  <span className="truncate max-w-[100px]">{st.name}</span>
                  <button
                    type="button"
                    title="ลบสติ๊กเกอร์นี้"
                    onClick={() => onRemoveSticker(st.id)}
                    className="text-rose-500 hover:text-rose-700 p-0.5 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Tabs */}
        <div className="flex gap-1.5 overflow-x-auto py-2 border-b border-stone-100 dark:border-stone-800 scrollbar-none">
          {STICKER_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap font-medium transition-all ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
              }`}
            >
              {cat.nameTh}
            </button>
          ))}
        </div>

        {/* Sticker Grid */}
        <div className="grid grid-cols-5 gap-2.5 py-4 max-h-64 overflow-y-auto">
          {currentCategory.stickers.map((item, idx) => (
            <button
              key={idx}
              type="button"
              id={`sticker-${idx}`}
              onClick={() => {
                onAddSticker(item.emoji, item.name, dateKey, slot);
              }}
              className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-stone-200 dark:border-stone-800 hover:border-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/30 transition-all hover:scale-105 active:scale-95 group"
            >
              <span className="text-2xl transition-transform group-hover:scale-110 mb-1">
                {item.emoji}
              </span>
              <span className="text-[10px] text-center text-stone-500 group-hover:text-stone-800 dark:group-hover:text-stone-200 truncate w-full leading-tight">
                {item.name}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
          <p className="text-[11px] text-stone-400">
            💡 คลิกสติ๊กเกอร์เพื่อแปะลงบนวันที่เลือก
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
          >
            เสร็จสิ้น
          </button>
        </div>
      </div>
    </div>
  );
};
