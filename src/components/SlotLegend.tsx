import React from 'react';
import { ThemeConfig } from '../types';

interface SlotLegendProps {
  theme: ThemeConfig;
}

export const SlotLegend: React.FC<SlotLegendProps> = ({ theme }) => {
  const items = [
    {
      title: theme.slots.morning.nameTh,
      icon: '🌅',
      time: '06:00-12:00',
      emptyBg: theme.slots.morning.emptyBg,
      emptyBorder: theme.slots.morning.emptyBorder,
      emptyText: theme.slots.morning.emptyText,
      activeBg: theme.slots.morning.activeBg,
      activeText: theme.slots.morning.activeText,
    },
    {
      title: theme.slots.afternoon.nameTh,
      icon: '☀️',
      time: '12:00-17:00',
      emptyBg: theme.slots.afternoon.emptyBg,
      emptyBorder: theme.slots.afternoon.emptyBorder,
      emptyText: theme.slots.afternoon.emptyText,
      activeBg: theme.slots.afternoon.activeBg,
      activeText: theme.slots.afternoon.activeText,
    },
    {
      title: theme.slots.evening.nameTh,
      icon: '🌙',
      time: '17:00-24:00',
      emptyBg: theme.slots.evening.emptyBg,
      emptyBorder: theme.slots.evening.emptyBorder,
      emptyText: theme.slots.evening.emptyText,
      activeBg: theme.slots.evening.activeBg,
      activeText: theme.slots.evening.activeText,
    },
  ];

  return (
    <div
      id="slot-legend-bar"
      className="py-1 px-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 text-xs select-none"
    >
      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
        <span className="font-semibold text-stone-700">3 ช่วงเวลา:</span>
        <span>(บน: เช้า • กลาง: บ่าย • ล่าง: เย็น)</span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto w-full sm:w-auto py-0.5">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1 shrink-0">
            <span className="text-xs">{item.icon}</span>
            <span className="text-[11px] font-medium">{item.title}</span>
            <span className="text-[9px] text-stone-400">({item.time})</span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded border ${item.emptyBg} ${item.emptyBorder} ${item.emptyText} ml-0.5`}
            >
              อ่อน
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${item.activeBg} ${item.activeText}`}
            >
              เข้ม
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
