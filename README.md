# Personal Finance Telegram Bot 🤖💰

> ระบบผู้ช่วยบันทึกรายรับ-รายจ่ายส่วนตัวผ่าน **Telegram** ขับเคลื่อนด้วย **Google Gemini Multimodal AI (Vision & Thai NLP)** และใช้ **Google Sheets** เป็น Single Source of Truth

---

## 🌟 ฟีเจอร์หลัก (Core Features)

- 📝 **บันทึกจากข้อความภาษาไทยธรรมดา:** เช่น `จ่าย 55 ข้าว`, `ซื้อกาแฟ 75`, `ได้รับ 500 จากแม่` โดย AI จะสกัดจำนวนเงิน หมวดหมู่ และทิศทางเงินให้อัตโนมัติ (ห้ามเดาตัวเลข)
- 🧾 **อ่านสลิปธนาคารไทยด้วย Vision AI:** สกัดยอดเงิน, วันที่, เวลา, ร้านค้า/ผู้รับ และเลขอ้างอิง (Transaction Reference) จากรูปสลิป (K PLUS, SCB, Krungthai ฯลฯ)
- 📷 **สลิป + ข้อความ:** ส่งรูปสลิปพร้อมพิมพ์คำอธิบายประกอบ เช่น `ค่าอาหารกับเพื่อน`
- 🛡️ **ระบบป้องกันรายการซ้ำ (Duplicate Protection):** ตรวจจับจากเลขอ้างอิงสลิป, Telegram File ID และเวลา-ยอดเงินซ้ำ
- 📊 **สรุปและคำนวณยอดเงินสด (Dynamic Calculation):** คำนวณจาก `Starting Balance + รายรับ - รายจ่าย = ยอดคงเหลือ` โดยอ่านสดจาก Google Sheets ทุกครั้ง
- 🔔 **แจ้งเตือนส่งยอดประจำวัน (Daily Reminder):** แจ้งเตือนเวลา 20:00 น. และ 22:00 น. หากวันนี้ยังไม่มีการบันทึกรายการ
- 📁 **ส่งออกข้อมูล (CSV Export):** ดาวน์โหลดไฟล์ CSV ของรายการทั้งหมดผ่านคำสั่ง `/export`
- 🔒 **ความปลอดภัยสูง (Security First):** Whitelist เฉพาะ Telegram User ID ที่ได้รับอนุญาตเท่านั้น และเก็บข้อมูลใน Google Sheets ส่วนตัวของคุณ

---

## 🏗️ โครงสร้างระบบ (Architecture)

```
src/
├── config/           # โหลดและตรวจสอบค่า Environment Variables (.env)
├── ai/               # เชื่อมต่อ Google Gemini API สำหรับแปลข้อความและอ่านรูปสลิป
├── sheets/           # เชื่อมต่อ Google Sheets API v4 ผ่าน Service Account
├── transactions/     # ตรรกะตรวจสอบข้อมูล (Validator) และตรวจจับรายการซ้ำ (Duplicate)
├── summary/          # คำนวณยอดคงเหลือ สรุปรายวัน และสรุปรายเดือนด้วย Code Logic
├── reminder/         # ตัวตั้งเวลาแจ้งเตือนรายวัน (node-cron) ตามเวลาประเทศไทย
├── bot/              # ตัวจัดการ Telegram Bot (grammY) และ Inline Keyboards
└── index.ts          # จุดเริ่มต้นการทำงานของแอปพลิเคชัน
```

---

## 📋 ความต้องการขั้นต่ำ (Requirements)

- **Node.js**: เวอร์ชัน 20 หรือ 22+ (ทดสอบแล้วบน Node.js v24 LTS)
- **Telegram Account**: สำหรับสร้าง Bot ผ่าน `@BotFather`
- **Google Cloud Account**: สำหรับเปิดใช้งาน Google Sheets API และสร้าง Service Account
- **Google AI Studio API Key**: สำหรับใช้งานโมเดล Gemini 2.5 Flash ฟรี

---

## 🚀 ขั้นตอนการติดตั้งและตั้งค่า (Step-by-Step Setup)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. สร้าง Telegram Bot Token
1. เปิด Telegram แล้วค้นหาบัญชี `@BotFather`
2. ส่งคำสั่ง `/newbot` แล้วตั้งชื่อบอท และ username (ต้องลงท้ายด้วย `bot`)
3. คัดลอก **HTTP API Token** ที่ได้มาเก็บไว้
4. ค้นหาบัญชี `@userinfobot` ใน Telegram เพื่อดู **Telegram User ID** ตัวเลขของคุณ

### 3. ขอรับ Gemini API Key (ฟรี)
1. ไปที่ [Google AI Studio](https://aistudio.google.com/)
2. เข้าสู่ระบบด้วยบัญชี Google แล้วคลิก **"Get API key"**
3. สร้างและคัดลอก API Key มาเก็บไว้

### 4. สร้าง Google Service Account & Google Sheets
1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. สร้างโปรเจกต์ใหม่ (เช่น `tele-finance-bot`)
3. ไปที่ **APIs & Services > Library** ค้นหาและกด **Enable "Google Sheets API"**
4. ไปที่ **IAM & Admin > Service Accounts** แล้วคลิก **Create Service Account**
5. ตั้งชื่อ Service Account แล้วกดสร้างเสร็จสิ้น
6. คลิกที่ Service Account ที่เพิ่งสร้าง > แท็บ **Keys** > กด **Add Key > Create new key > JSON**
7. ไฟล์ JSON จะถูกดาวน์โหลดลงเครื่อง ให้เปลี่ยนชื่อเป็น `service-account.json` แล้วนำมาวางไว้ในโฟลเดอร์โปรเจกต์นี้
8. คัดลอกอีเมลของ Service Account (ลงท้ายด้วย `@...iam.gserviceaccount.com`)
9. สร้าง Google Spreadsheet ใหม่ที่ [Google Sheets](https://sheets.new)
10. กดปุ่ม **แชร์ (Share)** ที่มุมขวาบนของ Spreadsheet แล้ววางอีเมล Service Account ลงไป กำหนดสิทธิ์เป็น **Editor**
11. คัดลอก **Spreadsheet ID** จาก URL ของเบราว์เซอร์:
    `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### 5. กำหนดค่า Environment Variables (.env)
คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
cp .env.example .env
```
จากนั้นแก้ไขค่าในไฟล์ `.env`:
```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
AUTHORIZED_TELEGRAM_USER_ID=123456789
GEMINI_API_KEY=AIzaSy...
GOOGLE_SHEET_ID=1A2B3C4D5E...
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json
TIMEZONE=Asia/Bangkok
DEFAULT_ACCOUNT=K PLUS
REMINDER_TIME=20:00
SECOND_REMINDER_TIME=22:00
```

---

## 🏃 การรันบอท (Running the Bot)

### โหมดพัฒนา (Development Mode)
```bash
npm run dev
```

### การรัน Unit Tests (TDD Verification)
```bash
npm test
```

### Build และ Run ใน Production
```bash
npm run build
node dist/src/index.js
```

---

## 💬 ตัวอย่างคำสั่งและการใช้งาน

- `จ่าย 55 ข้าว` ➜ บอทแสดงตัวอย่างรายการและปุ่มยืนยัน
- `ได้รับ 500 จากแม่` ➜ บันทึกเป็นรายรับ
- ส่งรูปสลิปโอนเงิน ➜ บอทอ่านยอดเงิน ร้านค้า วันเวลา และ Ref จากสลิป
- `/start` ➜ เริ่มต้นใช้งาน ตรวจสอบยอดเงินเริ่มต้น
- `/setbalance 5000` ➜ กำหนดยอดเงินเริ่มต้นเป็น 5,000 บาท
- `/today` หรือ "สรุปวันนี้" ➜ ดูสรุปรายรับ-รายจ่ายและหมวดหมู่ของวันนี้
- `/month` หรือ "สรุปเดือนนี้" ➜ ดูสรุปประจำเดือน ยอดสูงสุด และค่าเฉลี่ย
- `/balance` หรือ "ยอดเงินเหลือเท่าไหร่" ➜ ดูยอดเงินสุทธิคงเหลือจริง
- `/delete` ➜ ขอลบรายการล่าสุดที่เพิ่งบันทึก
- `/export` ➜ ดาวน์โหลดรายการทั้งหมดเป็นไฟล์ CSV

