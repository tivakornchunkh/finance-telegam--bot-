# PERSONAL FINANCE TELEGRAM BOT
## Telegram + AI Vision + Google Sheets + Daily Reminder

ระบบ **Personal Finance Assistant** สำหรับใช้ส่วนตัวผ่าน Telegram โดยมีเป้าหมายให้ผู้ใช้สามารถบันทึกรายรับรายจ่ายได้ง่ายที่สุด โดยไม่ต้องเปิด Web App

---

## 1. CORE FEATURES
1. บันทึกรายรับ (Income)
2. บันทึกรายจ่าย (Expense)
3. บันทึกจากข้อความธรรมดา (Natural Language Thai)
4. บันทึกจากรูปสลิป (Thai Bank Slips OCR/Vision)
5. บันทึกจากสลิป + ข้อความประกอบ
6. อ่านข้อมูลจากสลิปด้วย Vision AI
7. ตรวจสอบรายการก่อนบันทึก (Confirmation Mode)
8. แก้ไขรายการ (Edit)
9. ลบรายการ (Delete)
10. ป้องกันรายการซ้ำ (Duplicate Protection)
11. คำนวณยอดคงเหลือ (Balance Calculation)
12. สรุปรายวัน (Daily Summary)
13. สรุปรายเดือน (Monthly Summary)
14. วิเคราะห์ค่าใช้จ่ายตามหมวดหมู่ (Category Analysis)
15. แจ้งเตือนให้ส่งยอดทุกวัน (Daily Reminder)
16. ตรวจสอบว่าวันนี้ส่งยอดแล้วหรือยัง
17. Google Sheets Sync (Source of Truth)
18. Authentication ด้วย Telegram User ID
19. Export ข้อมูล (CSV)
20. รองรับภาษาไทยและ Natural Language

---

## 2. TRANSACTION TYPES
- `expense`: เงินออก (เช่น "จ่าย 55 ข้าว")
- `income`: เงินเข้า (เช่น "ได้รับ 500 จากแม่")
- หากไม่สามารถระบุได้: **ห้ามเดา ให้ถามผู้ใช้**

---

## 3. CATEGORIES
เริ่มต้น:
- อาหาร
- เดินทาง / น้ำมัน
- ที่พัก / ค่าไฟ / ค่าน้ำ
- เทคโนโลยี / ซอฟต์แวร์
- แบดมินตัน / กีฬา
- ของขวัญ / แฟน
- ความบันเทิง
- ช้อปปิ้ง
- เงินออม
- อื่น ๆ
(ต้องดึงจาก Sheet `Categories` เพื่อให้เพิ่ม/แก้ไขได้ในอนาคต)

---

## 4. DEFAULT ACCOUNT
- ค่าเริ่มต้น: `K PLUS` (เป็นเพียง label บันทึกในชีต ห้ามเชื่อมต่อระบบธนาคารจริง)

---

## 5. GOOGLE SHEETS AS SOURCE OF TRUTH
- Sheets ประกอบด้วย:
  1. `Transactions`
  2. `Settings`
  3. `Categories`
- Columns ใน `Transactions`:
  `ID`, `Date`, `Time`, `Type`, `Amount`, `Category`, `Description`, `Account`, `Source`, `Merchant`, `Reference`, `TelegramMessageID`, `CreatedBy`, `ReceiptReference`, `CreatedAt`
- ยอดคงเหลือ: `Starting Balance + Income - Expense = Current Balance` (อ่านสดจาก Sheet คำนวณด้วยโค้ด ไม่ cache ใน memory)

---

## 6. INTERACTION FLOWS
- **Text Transaction**: พิมพ์ภาษาธรรมชาติ -> AI แปลงเป็น Structured JSON -> แสดง Card ยืนยัน พร้อมปุ่ม [✅ ยืนยัน] [✏️ แก้ไข] [❌ ยกเลิก]
- **Slip Transaction**: ส่งรูปสลิป -> AI Vision สกัดข้อมูล (จำนวนเงิน, วันที่, เวลา, ผู้รับ/ร้านค้า, Transaction Ref) -> ตรวจสอบรายการซ้ำ -> แสดง Card ยืนยัน -> กดบันทึกลง Google Sheets
- **Slip + Message**: นำรูปสลิปและแคปชั่นมารวมกันเพื่อความแม่นยำของหมวดหมู่และคำอธิบาย
- **Reminder**: ตรวจสอบเวลา (เช่น 20:00, 22:00) ถ้าวันนี้ยังไม่มี transaction ให้แจ้งเตือน

---

## 7. ARCHITECTURE & CONSTRAINTS
- ภาษา: TypeScript / Node.js
- ห้ามสร้าง Web App / Dashboard ในเวอร์ชันแรก
- Secrets จัดเก็บใน `.env`
- AI เป็นเพียง Parser ไม่ใช่ Database
- คำนวณสรุปด้วย Logic ในโค้ด (Summary Engine) ไม่ให้ AI มโนตัวเลข

