export interface StickerCategory {
  id: string;
  nameTh: string;
  nameEn: string;
  stickers: Array<{ emoji: string; name: string }>;
}

export const STICKER_CATEGORIES: StickerCategory[] = [
  {
    id: 'work-study',
    nameTh: 'การงาน & เรียน',
    nameEn: 'Work & Study',
    stickers: [
      { emoji: '💻', name: 'งานคอม / ทำงาน' },
      { emoji: '📚', name: 'อ่านหนังสือ / ทบทวน' },
      { emoji: '📝', name: 'จดบันทึก / สอบ' },
      { emoji: '🎯', name: 'เป้าหมายสำคัญ' },
      { emoji: '💼', name: 'นัดคุยธุรกิจ' },
      { emoji: '📊', name: 'ประชุม / รายงาน' },
      { emoji: '💡', name: 'ไอเดียใหม่' },
      { emoji: '🚀', name: 'เปิดโปรเจกต์' },
      { emoji: '📅', name: 'กำหนดส่งงาน' },
      { emoji: '☕', name: 'พักเบรกกาแฟ' },
    ],
  },
  {
    id: 'lifestyle-fun',
    nameTh: 'ไลฟ์สไตล์ & ท่องเที่ยว',
    nameEn: 'Lifestyle & Fun',
    stickers: [
      { emoji: '🎉', name: 'ปาร์ตี้ / ฉลอง' },
      { emoji: '🍕', name: 'กินข้าวกับเพื่อน' },
      { emoji: '🎬', name: 'ดูหนัง' },
      { emoji: '✈️', name: 'เที่ยวบิน / เดินทาง' },
      { emoji: '🛍️', name: 'ช้อปปิ้ง' },
      { emoji: '🎂', name: 'วันเกิด' },
      { emoji: '🍻', name: 'สังสรรค์' },
      { emoji: '🚗', name: 'ขับรถเที่ยว' },
      { emoji: '🏖️', name: 'เที่ยวทะเล' },
      { emoji: '🎁', name: 'ของขวัญ' },
    ],
  },
  {
    id: 'health-wellness',
    nameTh: 'สุขภาพ & พักผ่อน',
    nameEn: 'Health & Wellness',
    stickers: [
      { emoji: '🏃', name: 'วิ่งออกกำลังกาย' },
      { emoji: '🧘', name: 'โยคะ / สมาธิ' },
      { emoji: '💊', name: 'กินยา / พบแพทย์' },
      { emoji: '💧', name: 'ดื่มน้ำให้พอ' },
      { emoji: '🥗', name: 'อาหารคลีน' },
      { emoji: '🏋️', name: 'ฟิตเนส' },
      { emoji: '🚴', name: 'ปั่นจักรยาน' },
      { emoji: '💤', name: 'นอนพักผ่อน' },
      { emoji: '🦷', name: 'หาหมอฟัน' },
      { emoji: '💆', name: 'นวดผ่อนคลาย' },
    ],
  },
  {
    id: 'priority-mood',
    nameTh: 'ความสำคัญ & อารมณ์',
    nameEn: 'Priority & Mood',
    stickers: [
      { emoji: '⭐', name: 'สำคัญพิเศษ' },
      { emoji: '🔥', name: 'ด่วนมาก' },
      { emoji: '💖', name: 'เดท / คนพิเศษ' },
      { emoji: '⚠️', name: 'อย่าลืมเด็ดขาด' },
      { emoji: '📌', name: 'ปักหมุด' },
      { emoji: '✅', name: 'เรียบร้อยแล้ว' },
      { emoji: '☀️', name: 'สดใส / วันดี' },
      { emoji: '🌧️', name: 'วันฝนตก' },
      { emoji: '🌸', name: 'วันสบายๆ' },
      { emoji: '🌙', name: 'คืนแสนสงบ' },
    ],
  },
];
