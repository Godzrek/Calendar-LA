import React from 'react';
import { THEMES } from '../constants/themes';
import { ThemeConfig } from '../types';
import { Palette, Check, X, Sparkles } from 'lucide-react';

interface ThemeSelectorProps {
  currentThemeId: string;
  onSelectTheme: (theme: ThemeConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({
  currentThemeId,
  onSelectTheme,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-2xl p-4 sm:p-5 text-stone-800 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900">
                เลือกธีมสีปฏิทิน ({THEMES.length} สไตล์)
              </h3>
              <p className="text-xs text-stone-500">
                เปลี่ยนบรรยากาศปฏิทินด้วยโทนสีที่เหมาะกับคุณ
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

        {/* Theme List Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3 overflow-y-auto pr-1">
          {THEMES.map((theme) => {
            const isSelected = theme.id === currentThemeId;
            return (
              <div
                key={theme.id}
                id={`theme-card-${theme.id}`}
                onClick={() => {
                  onSelectTheme(theme);
                  onClose();
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-2 relative ${
                  isSelected
                    ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-stone-900">
                      {theme.nameTh}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shrink-0">
                        <Check className="w-3 h-3" />
                        <span>ใช้งานอยู่</span>
                      </span>
                    ) : (
                      <span
                        className="w-3 h-3 rounded-full border border-stone-300"
                        style={{ backgroundColor: theme.accentColor }}
                        title={theme.name}
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {theme.description}
                  </p>
                </div>

                {/* 3 Slots Color Swatches (Theme-specific) */}
                <div className="pt-2 border-t border-stone-100 space-y-1">
                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-9 text-stone-400 font-medium">เช้า:</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-medium border ${theme.slots.morning.emptyBg} ${theme.slots.morning.emptyBorder} ${theme.slots.morning.emptyText}`}
                      >
                        ว่าง
                      </div>
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-bold border ${theme.slots.morning.activeBg} ${theme.slots.morning.activeBorder} ${theme.slots.morning.activeText}`}
                      >
                        มีนัด
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-9 text-stone-400 font-medium">บ่าย:</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-medium border ${theme.slots.afternoon.emptyBg} ${theme.slots.afternoon.emptyBorder} ${theme.slots.afternoon.emptyText}`}
                      >
                        ว่าง
                      </div>
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-bold border ${theme.slots.afternoon.activeBg} ${theme.slots.afternoon.activeBorder} ${theme.slots.afternoon.activeText}`}
                      >
                        มีนัด
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-[10px]">
                    <span className="w-9 text-stone-400 font-medium">เย็น:</span>
                    <div className="flex-1 flex gap-1 items-center">
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-medium border ${theme.slots.evening.emptyBg} ${theme.slots.evening.emptyBorder} ${theme.slots.evening.emptyText}`}
                      >
                        ว่าง
                      </div>
                      <div
                        className={`h-4 flex-1 rounded px-1 text-[9px] flex items-center justify-center font-bold border ${theme.slots.evening.activeBg} ${theme.slots.evening.activeBorder} ${theme.slots.evening.activeText}`}
                      >
                        มีนัด
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-stone-500">
            * สีแบ่งตามธีมชัดเจน โดยช่วงเวลาเดียวกันจะมีสีเดียวกันเสมอเพื่อความรวดเร็วในการดู
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
