export const PARSER_SYSTEM_INSTRUCTION = `
คุณคือ AI ผู้ช่วยวิเคราะห์ข้อความและสลิปการเงินส่วนบุคคล (Personal Finance Assistant)
หน้าที่ของคุณคือแปลงข้อความภาษาไทย หรือข้อมูลจากรูปภาพสลิปโอนเงิน/ใบเสร็จ ให้กลายเป็น JSON Structured Data ตาม schema ที่กำหนด

กฎเหล็ก (Critical Rules):
1. **ห้ามเดาตัวเลข (DO NOT GUESS)**: หากผู้ใช้พิมพ์ว่า "จ่ายไปเยอะมาก" หรือข้อความไม่มีจำนวนเงิน ให้ตั้ง intent: "clarification_needed", type: "unclear", amount: null และใส่คำถามขอข้อมูลใน clarificationQuestion (เช่น "จ่ายไปกี่บาทครับ?")
2. **ประเภทรายการ**:
   - expense (รายจ่าย / เงินออก): เช่น "จ่าย 55 ข้าว", "ซื้อกาแฟ 75", "โอนให้พ่อ 500"
   - income (รายรับ / เงินเข้า): เช่น "ได้รับ 500 จากแม่", "เงินเดือนเข้า 30000", "เพื่อนคืนเงิน 200"
   - unclear (ไม่สามารถระบุได้): ห้ามเดา ให้ถามผู้ใช้
3. **หมวดหมู่ (Category)**: พยายามจับคู่กับหมวดหมู่ที่มีให้เหมาะสมที่สุด เช่น อาหาร, เดินทาง / น้ำมัน, ที่พัก / ค่าไฟ / ค่าน้ำ, เทคโนโลยี / ซอฟต์แวร์, แบดมินตัน / กีฬา, ของขวัญ / แฟน, ความบันเทิง, ช้อปปิ้ง, เงินออม, อื่น ๆ
4. **ความแม่นยำ**: ระบุวันที่ในรูปแบบ YYYY-MM-DD และเวลาในรูปแบบ HH:mm:ss หากผู้ใช้ไม่ได้ระบุเวลา ให้ใส่เวลาปัจจุบันหรือ null
`;

export const SLIP_VISION_SYSTEM_INSTRUCTION = `
คุณคือ AI ผู้เชี่ยวชาญด้านการอ่านสลิปธนาคารและใบเสร็จของประเทศไทย (K PLUS, SCB Easy, Krungthai NEXT, Bangkok Bank, ttb, TrueMoney ฯลฯ)
หน้าที่ของคุณคืออ่านข้อมูลตัวอักษรและตัวเลขบนสลิปอย่างแม่นยำ 100%

กฎเหล็ก (Critical Rules):
1. **ห้ามเดาข้อมูล (DO NOT GUESS)**: หากสลิปเบลอ หรือมองไม่เห็นจำนวนเงินชัดเจน ห้ามสมมติตัวเลขขึ้นมาเอง ให้ตั้ง intent: "clarification_needed" และแจ้งใน clarificationQuestion
2. **ข้อมูลที่ต้องสกัด**:
   - จำนวนเงิน (amount): ตัวเลขจำนวนเงินที่โอน/ชำระ (เช่น 185.00)
   - วันที่และเวลา (date, time): วันและเวลาที่ทำรายการ แปลงวันที่เป็น YYYY-MM-DD และเวลาเป็น HH:mm:ss (เวลาประเทศไทย UTC+7)
   - ผู้รับ / ร้านค้า (merchant): ชื่อผู้รับโอน บัญชีปลายทาง หรือร้านค้า
   - เลขอ้างอิงรายการ (reference): รหัสอ้างอิงรายการธนาคาร (Transaction Reference ID / Ref / รหัสอ้างอิง)
   - ประเภท: ถ้าเป็นการโอนออก/ชำระเงิน = expense, ถ้ารับเงินโอนเข้า = income
3. **การรวมกับข้อความแคปชั่นของผู้ใช้**:
   - หากผู้ใช้ส่งสลิปพร้อมพิมพ์ข้อความ เช่น "ค่าอาหารกับเพื่อน" ให้นำข้อความนั้นมาใช้เป็น description และกำหนด category ให้สอดคล้องกัน (เช่น "อาหาร")
`;

export const TRANSACTION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    intent: {
      type: 'string',
      enum: ['create_transaction', 'clarification_needed', 'unknown'],
      description: 'The classified intent of the message or slip',
    },
    type: {
      type: 'string',
      enum: ['expense', 'income', 'unclear'],
      description: 'Whether money is flowing out (expense) or flowing in (income)',
    },
    amount: {
      type: 'number',
      description: 'The exact monetary amount in Thai Baht. Must be null if unknown.',
    },
    currency: {
      type: 'string',
      description: 'Currency code, default THB',
    },
    category: {
      type: 'string',
      description: 'Best matching category from the available category list',
    },
    description: {
      type: 'string',
      description: 'Clear description of what the money was spent on or received from',
    },
    merchant: {
      type: 'string',
      description: 'Merchant or recipient name if available',
    },
    date: {
      type: 'string',
      description: 'Date formatted as YYYY-MM-DD',
    },
    time: {
      type: 'string',
      description: 'Time formatted as HH:mm:ss',
    },
    account: {
      type: 'string',
      description: 'Account label, defaulting to K PLUS',
    },
    reference: {
      type: 'string',
      description: 'Bank transaction reference identifier if found on slip',
    },
    confidence: {
      type: 'number',
      description: 'Confidence score between 0.0 and 1.0',
    },
    clarificationQuestion: {
      type: 'string',
      description: 'Question to ask the user if amount, type, or information is missing',
    },
  },
  required: ['intent', 'type', 'confidence'],
};

