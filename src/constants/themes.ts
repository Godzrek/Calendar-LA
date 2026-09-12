import { ThemeConfig, SlotThemeColors } from '../types';

// Helper to create slot configs
function makeSlots(
  morning: {
    emptyBg: string;
    emptyBorder: string;
    emptyText: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    activeBadge: string;
    accentDot: string;
  },
  afternoon: {
    emptyBg: string;
    emptyBorder: string;
    emptyText: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    activeBadge: string;
    accentDot: string;
  },
  evening: {
    emptyBg: string;
    emptyBorder: string;
    emptyText: string;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    activeBadge: string;
    accentDot: string;
  }
): {
  morning: SlotThemeColors;
  afternoon: SlotThemeColors;
  evening: SlotThemeColors;
} {
  return {
    morning: {
      nameTh: 'ช่วงเช้า',
      nameEn: 'Morning',
      timeRange: '06:00 - 12:00',
      ...morning,
    },
    afternoon: {
      nameTh: 'ช่วงบ่าย',
      nameEn: 'Afternoon',
      timeRange: '12:00 - 17:00',
      ...afternoon,
    },
    evening: {
      nameTh: 'ช่วงเย็น',
      nameEn: 'Evening',
      timeRange: '17:00 - 24:00',
      ...evening,
    },
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'minimal',
    name: 'Minimal Clean',
    nameTh: '1. มินิมอล คลีน (Minimal)',
    description: 'ขาว คลีน สบายตา: เช้าเขียวเสจ • บ่ายทองฟางข้าว • เย็นเทาสเลท เรียบหรูอ่านง่าย',
    isDark: false,
    appBg: 'bg-[#fafafa]',
    cardBg: 'bg-white',
    cardBorder: 'border-stone-200/80',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-stone-900',
    mutedText: 'text-stone-400',
    primaryBtn: 'bg-stone-900 hover:bg-black text-white shadow-xs',
    secondaryBtn: 'bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200',
    accentColor: '#1c1917',
    slots: makeSlots(
      // Morning: Sage Green
      {
        emptyBg: 'bg-[#f0fdf4]/70 hover:bg-[#f0fdf4]',
        emptyBorder: 'border-[#bbf7d0]/80',
        emptyText: 'text-[#15803d]',
        activeBg: 'bg-[#bbf7d0] hover:bg-[#a7f3d0]',
        activeBorder: 'border-[#86efac]',
        activeText: 'text-[#14532d]',
        activeBadge: 'bg-[#15803d]/15 text-[#14532d]',
        accentDot: 'bg-[#15803d]',
      },
      // Afternoon: Warm Wheat / Amber
      {
        emptyBg: 'bg-[#fffbeb]/70 hover:bg-[#fffbeb]',
        emptyBorder: 'border-[#fde68a]/80',
        emptyText: 'text-[#b45309]',
        activeBg: 'bg-[#fde68a] hover:bg-[#fcd34d]',
        activeBorder: 'border-[#facc15]',
        activeText: 'text-[#78350f]',
        activeBadge: 'bg-[#b45309]/15 text-[#78350f]',
        accentDot: 'bg-[#b45309]',
      },
      // Evening: Cool Slate Gray
      {
        emptyBg: 'bg-[#f1f5f9]/70 hover:bg-[#f1f5f9]',
        emptyBorder: 'border-[#cbd5e1]/80',
        emptyText: 'text-[#475569]',
        activeBg: 'bg-[#cbd5e1] hover:bg-[#94a3b8]',
        activeBorder: 'border-[#94a3b8]',
        activeText: 'text-[#0f172a]',
        activeBadge: 'bg-[#475569]/15 text-[#0f172a]',
        accentDot: 'bg-[#475569]',
      }
    ),
  },
  {
    id: 'cute',
    name: 'Pastel Sweet',
    nameTh: '2. น่ารัก พาสเทล (Sweet Pink)',
    description: 'หวานละมุนน่ารัก: เช้าส้มพีช • บ่ายชมพูเบอร์รี่ • เย็นม่วงลาเวนเดอร์ สดใสตลอดวัน',
    isDark: false,
    appBg: 'bg-[#fff8fa]',
    cardBg: 'bg-white',
    cardBorder: 'border-rose-100',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-stone-800',
    mutedText: 'text-stone-500',
    primaryBtn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-xs',
    secondaryBtn: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
    accentColor: '#f43f5e',
    slots: makeSlots(
      // Morning: Soft Peach
      {
        emptyBg: 'bg-[#fff7ed]/70 hover:bg-[#fff7ed]',
        emptyBorder: 'border-[#fed7aa]/80',
        emptyText: 'text-[#ea580c]',
        activeBg: 'bg-[#fed7aa] hover:bg-[#fdba74]',
        activeBorder: 'border-[#fb923c]',
        activeText: 'text-[#7c2d12]',
        activeBadge: 'bg-[#ea580c]/15 text-[#7c2d12]',
        accentDot: 'bg-[#ea580c]',
      },
      // Afternoon: Strawberry Pink
      {
        emptyBg: 'bg-[#fff1f2]/70 hover:bg-[#fff1f2]',
        emptyBorder: 'border-[#fecdd3]/80',
        emptyText: 'text-[#e11d48]',
        activeBg: 'bg-[#fecdd3] hover:bg-[#fda4af]',
        activeBorder: 'border-[#fb7185]',
        activeText: 'text-[#881337]',
        activeBadge: 'bg-[#e11d48]/15 text-[#881337]',
        accentDot: 'bg-[#e11d48]',
      },
      // Evening: Sweet Taro Lavender
      {
        emptyBg: 'bg-[#faf5ff]/70 hover:bg-[#faf5ff]',
        emptyBorder: 'border-[#e9d5ff]/80',
        emptyText: 'text-[#9333ea]',
        activeBg: 'bg-[#e9d5ff] hover:bg-[#d8b4fe]',
        activeBorder: 'border-[#c084fc]',
        activeText: 'text-[#581c87]',
        activeBadge: 'bg-[#9333ea]/15 text-[#581c87]',
        accentDot: 'bg-[#9333ea]',
      }
    ),
  },
  {
    id: 'luxury',
    name: 'Luxury Champagne',
    nameTh: '3. หรูหรา แชมเปญ (Luxury)',
    description: 'สง่างาม ไฮเอนด์: เช้าครีมทอง • บ่ายแชมเปญบรอนซ์ • เย็นไข่มุกสโตน เรียบหรูพรีเมียม',
    isDark: false,
    appBg: 'bg-[#fcfaf7]',
    cardBg: 'bg-white',
    cardBorder: 'border-[#eae3d5]',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-[#2a241e]',
    mutedText: 'text-[#857b6f]',
    primaryBtn: 'bg-[#2a241e] hover:bg-[#1a1612] text-[#f8ecc2] shadow-xs',
    secondaryBtn: 'bg-[#f5efe4] hover:bg-[#ede3d2] text-[#4a3f35] border border-[#dcd1be]',
    accentColor: '#c59b27',
    slots: makeSlots(
      // Morning: Ivory Gold
      {
        emptyBg: 'bg-[#fefce8]/70 hover:bg-[#fefce8]',
        emptyBorder: 'border-[#fef08a]/80',
        emptyText: 'text-[#a16207]',
        activeBg: 'bg-[#fef08a] hover:bg-[#fde047]',
        activeBorder: 'border-[#eab308]',
        activeText: 'text-[#713f12]',
        activeBadge: 'bg-[#a16207]/15 text-[#713f12]',
        accentDot: 'bg-[#a16207]',
      },
      // Afternoon: Champagne Bronze
      {
        emptyBg: 'bg-[#fffbeb]/70 hover:bg-[#fffbeb]',
        emptyBorder: 'border-[#fde68a]/80',
        emptyText: 'text-[#d97706]',
        activeBg: 'bg-[#fde68a] hover:bg-[#fcd34d]',
        activeBorder: 'border-[#f59e0b]',
        activeText: 'text-[#78350f]',
        activeBadge: 'bg-[#d97706]/15 text-[#78350f]',
        accentDot: 'bg-[#d97706]',
      },
      // Evening: Platinum Warm Stone
      {
        emptyBg: 'bg-[#f5f5f4]/70 hover:bg-[#f5f5f4]',
        emptyBorder: 'border-[#e7e5e4]/80',
        emptyText: 'text-[#78716c]',
        activeBg: 'bg-[#e7e5e4] hover:bg-[#d6d3d1]',
        activeBorder: 'border-[#a8a29e]',
        activeText: 'text-[#292524]',
        activeBadge: 'bg-[#78716c]/15 text-[#292524]',
        accentDot: 'bg-[#78716c]',
      }
    ),
  },
  {
    id: 'formal',
    name: 'Formal Slate',
    nameTh: '4. ทางการ กรมท่า (Formal Navy)',
    description: 'สุภาพ มั่นใจ: เช้าสกายบลู • บ่ายทีลสตีล • เย็นโคบอลต์เนวี สไตล์องค์กรคมชัด',
    isDark: false,
    appBg: 'bg-[#f8fafc]',
    cardBg: 'bg-white',
    cardBorder: 'border-slate-200',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-slate-900',
    mutedText: 'text-slate-500',
    primaryBtn: 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs',
    secondaryBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300',
    accentColor: '#0f172a',
    slots: makeSlots(
      // Morning: Sky Blue
      {
        emptyBg: 'bg-[#f0f9ff]/70 hover:bg-[#f0f9ff]',
        emptyBorder: 'border-[#bae6fd]/80',
        emptyText: 'text-[#0284c7]',
        activeBg: 'bg-[#bae6fd] hover:bg-[#7dd3fc]',
        activeBorder: 'border-[#38bdf8]',
        activeText: 'text-[#0c4a6e]',
        activeBadge: 'bg-[#0284c7]/15 text-[#0c4a6e]',
        accentDot: 'bg-[#0284c7]',
      },
      // Afternoon: Steel Teal
      {
        emptyBg: 'bg-[#f0fdfa]/70 hover:bg-[#f0fdfa]',
        emptyBorder: 'border-[#99f6e4]/80',
        emptyText: 'text-[#0d9488]',
        activeBg: 'bg-[#99f6e4] hover:bg-[#5eead4]',
        activeBorder: 'border-[#2dd4bf]',
        activeText: 'text-[#134e4a]',
        activeBadge: 'bg-[#0d9488]/15 text-[#134e4a]',
        accentDot: 'bg-[#0d9488]',
      },
      // Evening: Navy Slate
      {
        emptyBg: 'bg-[#f1f5f9]/70 hover:bg-[#f1f5f9]',
        emptyBorder: 'border-[#cbd5e1]/80',
        emptyText: 'text-[#334155]',
        activeBg: 'bg-[#cbd5e1] hover:bg-[#94a3b8]',
        activeBorder: 'border-[#64748b]',
        activeText: 'text-[#0f172a]',
        activeBadge: 'bg-[#334155]/15 text-[#0f172a]',
        accentDot: 'bg-[#334155]',
      }
    ),
  },
  {
    id: 'matcha',
    name: 'Matcha Nature',
    nameTh: '5. มัทฉะ ธรรมชาติ (Matcha Green)',
    description: 'ผ่อนคลาย สดชื่น: เช้าไผ่อ่อน • บ่ายมัทฉะแท้ • เย็นชาเกนไมข้าวคั่ว ละมุนใจ',
    isDark: false,
    appBg: 'bg-[#f7faf8]',
    cardBg: 'bg-white',
    cardBorder: 'border-emerald-100',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-emerald-950',
    mutedText: 'text-emerald-700/60',
    primaryBtn: 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs',
    secondaryBtn: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200',
    accentColor: '#047857',
    slots: makeSlots(
      // Morning: Fresh Bamboo Mint
      {
        emptyBg: 'bg-[#ecfdf5]/70 hover:bg-[#ecfdf5]',
        emptyBorder: 'border-[#a7f3d0]/80',
        emptyText: 'text-[#059669]',
        activeBg: 'bg-[#a7f3d0] hover:bg-[#6ee7b7]',
        activeBorder: 'border-[#34d399]',
        activeText: 'text-[#064e3b]',
        activeBadge: 'bg-[#059669]/15 text-[#064e3b]',
        accentDot: 'bg-[#059669]',
      },
      // Afternoon: Pure Matcha Olive
      {
        emptyBg: 'bg-[#f7fee7]/70 hover:bg-[#f7fee7]',
        emptyBorder: 'border-[#d9f99d]/80',
        emptyText: 'text-[#65a30d]',
        activeBg: 'bg-[#d9f99d] hover:bg-[#bef264]',
        activeBorder: 'border-[#a3e635]',
        activeText: 'text-[#365314]',
        activeBadge: 'bg-[#65a30d]/15 text-[#365314]',
        accentDot: 'bg-[#65a30d]',
      },
      // Evening: Roasted Genmaicha Gold
      {
        emptyBg: 'bg-[#fefce8]/70 hover:bg-[#fefce8]',
        emptyBorder: 'border-[#fef08a]/80',
        emptyText: 'text-[#ca8a04]',
        activeBg: 'bg-[#fef08a] hover:bg-[#fde047]',
        activeBorder: 'border-[#eab308]',
        activeText: 'text-[#713f12]',
        activeBadge: 'bg-[#ca8a04]/15 text-[#713f12]',
        accentDot: 'bg-[#ca8a04]',
      }
    ),
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    nameTh: '6. โอเชี่ยน ลมทะเล (Ocean Blue)',
    description: 'ทะเลสดชื่น ปลอดโปร่ง: เช้าฟ้าน้ำใส • บ่ายน้ำทะเลลึก • เย็นครามอินดิโก้ เย็นตาสบายใจ',
    isDark: false,
    appBg: 'bg-[#f6faff]',
    cardBg: 'bg-white',
    cardBorder: 'border-sky-100',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-sky-950',
    mutedText: 'text-sky-700/60',
    primaryBtn: 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs',
    secondaryBtn: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200',
    accentColor: '#0284c7',
    slots: makeSlots(
      // Morning: Crystal Aqua
      {
        emptyBg: 'bg-[#f0fdfa]/70 hover:bg-[#f0fdfa]',
        emptyBorder: 'border-[#99f6e4]/80',
        emptyText: 'text-[#0d9488]',
        activeBg: 'bg-[#99f6e4] hover:bg-[#5eead4]',
        activeBorder: 'border-[#2dd4bf]',
        activeText: 'text-[#134e4a]',
        activeBadge: 'bg-[#0d9488]/15 text-[#134e4a]',
        accentDot: 'bg-[#0d9488]',
      },
      // Afternoon: Deep Azure
      {
        emptyBg: 'bg-[#f0f9ff]/70 hover:bg-[#f0f9ff]',
        emptyBorder: 'border-[#bae6fd]/80',
        emptyText: 'text-[#0284c7]',
        activeBg: 'bg-[#bae6fd] hover:bg-[#7dd3fc]',
        activeBorder: 'border-[#38bdf8]',
        activeText: 'text-[#0c4a6e]',
        activeBadge: 'bg-[#0284c7]/15 text-[#0c4a6e]',
        accentDot: 'bg-[#0284c7]',
      },
      // Evening: Marine Indigo
      {
        emptyBg: 'bg-[#eef2ff]/70 hover:bg-[#eef2ff]',
        emptyBorder: 'border-[#c7d2fe]/80',
        emptyText: 'text-[#4f46e5]',
        activeBg: 'bg-[#c7d2fe] hover:bg-[#a5b4fc]',
        activeBorder: 'border-[#818cf8]',
        activeText: 'text-[#312e81]',
        activeBadge: 'bg-[#4f46e5]/15 text-[#312e81]',
        accentDot: 'bg-[#4f46e5]',
      }
    ),
  },
  {
    id: 'sunset',
    name: 'Sunset Coral',
    nameTh: '7. ซันเซ็ต คอรัล (Warm Coral)',
    description: 'อบอุ่น มีพลัง: เช้าทองรำไร • บ่ายส้มคอรัล • เย็นกุหลาบแซลมอน บรรยากาศพระอาทิตย์ตกดิน',
    isDark: false,
    appBg: 'bg-[#fffaf5]',
    cardBg: 'bg-white',
    cardBorder: 'border-amber-100',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-stone-900',
    mutedText: 'text-amber-700/60',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    secondaryBtn: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200',
    accentColor: '#d97706',
    slots: makeSlots(
      // Morning: Golden Sunrise
      {
        emptyBg: 'bg-[#fefce8]/70 hover:bg-[#fefce8]',
        emptyBorder: 'border-[#fde047]/80',
        emptyText: 'text-[#ca8a04]',
        activeBg: 'bg-[#fef08a] hover:bg-[#fde047]',
        activeBorder: 'border-[#eab308]',
        activeText: 'text-[#713f12]',
        activeBadge: 'bg-[#ca8a04]/15 text-[#713f12]',
        accentDot: 'bg-[#ca8a04]',
      },
      // Afternoon: Vivid Tangerine Coral
      {
        emptyBg: 'bg-[#fff7ed]/70 hover:bg-[#fff7ed]',
        emptyBorder: 'border-[#fed7aa]/80',
        emptyText: 'text-[#ea580c]',
        activeBg: 'bg-[#fed7aa] hover:bg-[#fdba74]',
        activeBorder: 'border-[#fb923c]',
        activeText: 'text-[#7c2d12]',
        activeBadge: 'bg-[#ea580c]/15 text-[#7c2d12]',
        accentDot: 'bg-[#ea580c]',
      },
      // Evening: Dusk Rose Salmon
      {
        emptyBg: 'bg-[#fff1f2]/70 hover:bg-[#fff1f2]',
        emptyBorder: 'border-[#fecdd3]/80',
        emptyText: 'text-[#e11d48]',
        activeBg: 'bg-[#fecdd3] hover:bg-[#fda4af]',
        activeBorder: 'border-[#fb7185]',
        activeText: 'text-[#881337]',
        activeBadge: 'bg-[#e11d48]/15 text-[#881337]',
        accentDot: 'bg-[#e11d48]',
      }
    ),
  },
  {
    id: 'lavender',
    name: 'Lavender Dream',
    nameTh: '8. ลาเวนเดอร์ ดรีม (Lilac Dream)',
    description: 'ละมุนชวนฝัน: เช้าหมอกเพอริวิงเคิล • บ่ายดอกไลแลค • เย็นพลัมทไวไลท์ สงบนุ่มนวล',
    isDark: false,
    appBg: 'bg-[#faf8fe]',
    cardBg: 'bg-white',
    cardBorder: 'border-purple-100',
    headerBg: 'bg-white/95 backdrop-blur-md',
    textColor: 'text-purple-950',
    mutedText: 'text-purple-700/60',
    primaryBtn: 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs',
    secondaryBtn: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200',
    accentColor: '#7c3aed',
    slots: makeSlots(
      // Morning: Periwinkle Mist
      {
        emptyBg: 'bg-[#eef2ff]/70 hover:bg-[#eef2ff]',
        emptyBorder: 'border-[#c7d2fe]/80',
        emptyText: 'text-[#4f46e5]',
        activeBg: 'bg-[#c7d2fe] hover:bg-[#a5b4fc]',
        activeBorder: 'border-[#818cf8]',
        activeText: 'text-[#312e81]',
        activeBadge: 'bg-[#4f46e5]/15 text-[#312e81]',
        accentDot: 'bg-[#4f46e5]',
      },
      // Afternoon: Blooming Lilac
      {
        emptyBg: 'bg-[#f5f3ff]/70 hover:bg-[#f5f3ff]',
        emptyBorder: 'border-[#ddd6fe]/80',
        emptyText: 'text-[#7c3aed]',
        activeBg: 'bg-[#ddd6fe] hover:bg-[#c4b5fd]',
        activeBorder: 'border-[#a78bfa]',
        activeText: 'text-[#4c1d95]',
        activeBadge: 'bg-[#7c3aed]/15 text-[#4c1d95]',
        accentDot: 'bg-[#7c3aed]',
      },
      // Evening: Twilight Plum
      {
        emptyBg: 'bg-[#faf5ff]/70 hover:bg-[#faf5ff]',
        emptyBorder: 'border-[#e9d5ff]/80',
        emptyText: 'text-[#9333ea]',
        activeBg: 'bg-[#e9d5ff] hover:bg-[#d8b4fe]',
        activeBorder: 'border-[#c084fc]',
        activeText: 'text-[#581c87]',
        activeBadge: 'bg-[#9333ea]/15 text-[#581c87]',
        accentDot: 'bg-[#9333ea]',
      }
    ),
  },
];

export const DEFAULT_THEME = THEMES[0]; // Default to Minimal

export function getThemeById(themeId: string): ThemeConfig {
  return THEMES.find((t) => t.id === themeId) || DEFAULT_THEME;
}
