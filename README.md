# Telegram Finance Bot

บอทบันทึกรายรับรายจ่ายส่วนตัวบน Telegram เชื่อมต่อกับ Google Sheets โดยใช้ Gemini AI ช่วยอ่านสลิปธนาคาร ถอดเสียงพูด และคุยตอบคำถามเรื่องการเงิน

ทำโปรเจกต์นี้ขึ้นมาเพราะขี้เกียจเปิดแอปจดบัญชี อยากได้อะไรที่ส่งรูปสลิปตอนโอนเงิน หรือพิมพ์สั้นๆ เข้า Telegram แล้วมันบันทึกลง Google Sheets ให้ทันที

## ฟีเจอร์

- ส่งรูปสลิปธนาคาร (รองรับเกือบทุกธนาคารในไทย) บอทจะดึงยอดเงิน วันที่ เวลา และเลขอ้างอิงไปลง Google Sheet ให้
- พิมพ์ข้อความธรรมดา เช่น "ข้าวเที่ยง 60" หรือ "ได้เงินคืน 500" บอทแยกหมวดหมู่และรายรับ/รายจ่ายให้
- ส่งข้อความเสียงภาษาไทยได้ ถ้าขี้เกียจพิมพ์
- สรุปยอดรายวัน รายเดือน และสร้างกราฟวงกลมสรุปค่าใช้จ่าย (`/chart`)
- ตั้งงบประมาณรายเดือน (`/setbudget`) มีแถบเช็คสถานะ และเตือนเมื่อใช้เงินใกล้หมด
- ถามตอบเรื่องการเงิน บอทจะนำข้อมูลในชีตมาช่วยวิเคราะห์และตอบ
- สลับโหมดการบันทึกได้ (`/mode`) เลือกระหว่างบันทึกทันที หรือให้แสดงปุ่มกดยืนยันก่อน
- ล็อกสิทธิ์เฉพาะ Telegram User ID เจ้าของเครื่อง คนอื่นทักมาบอทจะไม่ตอบ

## สิ่งที่ต้องเตรียม

1. Node.js (แนะนำ v20 ขึ้นไป)
2. Token บอท Telegram (สร้างผ่าน @BotFather)
3. Telegram User ID ของคุณ (เช็คได้จากบอท @userinfobot)
4. Gemini API Key (ขอฟรีได้ที่ aistudio.google.com)
5. Google Sheet + Service Account JSON สำหรับเขียนข้อมูลลงชีต

## วิธีติดตั้งและรัน

### 1. โคลนโปรเจกต์

```bash
git clone https://github.com/tivakornchunkh/finance-telegam--bot-.git
cd finance-telegam--bot-
npm install
```

### 2. ตั้งค่า Google Sheets และ Service Account

1. เข้า Google Cloud Console แล้วสร้างโปรเจกต์ใหม่
2. ไปที่ APIs & Services > Library แล้วกดเปิดใช้งาน **Google Sheets API**
3. ไปที่ IAM & Admin > Service Accounts กดสร้าง Service Account
4. คลิกเข้าไปที่ Service Account นั้น > ไปที่แท็บ Keys > กด Add Key > Create new key เลือก **JSON**
5. นำไฟล์ที่ดาวน์โหลดมา เปลี่ยนชื่อเป็น `service-account.json` แล้วเอามาวางไว้ในโฟลเดอร์โปรเจกต์
6. สร้าง Google Sheet เปล่าขึ้นมา 1 ไฟล์
7. กดปุ่มแชร์ที่มุมขวาบนของ Google Sheet ใส่อีเมลของ Service Account (ลงท้ายด้วย `@...iam.gserviceaccount.com`) และให้สิทธิ์เป็น **Editor**
8. คัดลอก Sheet ID จาก URL ของ Google Sheet:
   `https://docs.google.com/spreadsheets/d/<ตรงนี้คือ_SHEET_ID>/edit`

### 3. ตั้งค่า .env

ก๊อปปี้ไฟล์ตัวอย่าง:

```bash
cp .env.example .env
```

เปิดไฟล์ `.env` แล้วกรอกข้อมูลของคุณ:

```env
TELEGRAM_BOT_TOKEN=token_จาก_botfather
AUTHORIZED_TELEGRAM_USER_ID=user_id_ของคุณ
GEMINI_API_KEY=api_key_จาก_aistudio
GOOGLE_SHEET_ID=sheet_id_ของคุณ
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json
TIMEZONE=Asia/Bangkok
```

หรือจะใช้ตัวช่วยถามตอบทีละขั้นก็ได้ โดยรันคำสั่ง:
```bash
npm run setup
```

### 4. รันบอท

```bash
npm run build
npm start
```

ถ้าขึ้นข้อความว่า `Bot is running and listening for messages!` แสดงว่าบอทเริ่มทำงานแล้ว ทดสอบทักไปใน Telegram ได้เลย

---

## วิธีนำขึ้น Google Cloud Run (ออนไลน์ 24 ชม. ฟรี ไม่ต้องเปิดคอม)

ระบบนี้รองรับ **Google Cloud Run (Serverless Webhook)** ในตัว ทำให้บอทออนไลน์ตลอด 24 ชั่วโมงโดยไม่มีวันหลับ และใช้โควต้าฟรีของ Google Cloud ได้เต็มที่

1. อัปโหลดโปรเจกต์นี้ขึ้น GitHub ของคุณ (ตั้งเป็น Private)
2. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com/) > ไปที่เมนู **Cloud Run**
3. กดปุ่ม **Create Service**
4. เลือก **Continuously deploy from a repository** แล้วเชื่อมต่อ GitHub กับโปรเจกต์นี้
5. เลือก Build type เป็น **Dockerfile**
6. ตั้งค่า Service:
   - **Region:** `asia-southeast1` (สิงคโปร์ - เร็วที่สุดสำหรับไทย)
   - **Authentication:** เลือก `Allow unauthenticated invocations`
   - **Scaling:** Minimum instances ตั้งเป็น `0` (เพื่อให้สเกลลงเมื่อไม่มีคนใช้ ไม่เสียค่าบริการ)
7. ในหัวข้อ **Variables & Secrets** ให้เพิ่ม Environment Variables:
   - `TELEGRAM_BOT_TOKEN`
   - `AUTHORIZED_TELEGRAM_USER_ID`
   - `GEMINI_API_KEY`
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SERVICE_ACCOUNT_JSON` (ใส่รหัส JSON ของ Service Account เป็นบรรทัดเดียว หรือแปลงเป็น Base64)
   - `BOT_MODE` = `webhook`
   - `WEBHOOK_URL` = URL ของ Cloud Run ที่ได้ (เช่น `https://xxx.a.run.app`)
8. กด **Create** รอระบบสร้างเสร็จ บอทจะออนไลน์ 24 ชั่วโมงทันที

---

## คำสั่งในบอท

- `/start` - เริ่มต้นใช้งาน
- `/today` - สรุปยอดวันนี้
- `/month` - สรุปยอดเดือนนี้
- `/chart` - ดูกราฟวงกลมสรุปรายจ่ายเดือนนี้
- `/balance` - เช็คยอดคงเหลือ
- `/budget` - เช็คสถานะงบประมาณ
- `/setbudget <จำนวนเงิน>` - กำหนดงบเดือนนี้ เช่น `/setbudget 15000`
- `/setbalance <จำนวนเงิน>` - กำหนดยอดเงินตั้งต้น
- `/mode` - สลับระหว่างโหมดบันทึกทันที (Auto-Save) หรือให้ขึ้นปุ่มยืนยันก่อน (Confirm)
- `/limits` - เช็คโควต้า Gemini และ Sheets API
- `/delete` - ลบรายการล่าสุดที่เพิ่งบันทึก
- `/export` - ดาวน์โหลดข้อมูลเป็นไฟล์ CSV

## ข้อควรระวัง

- ถ้าบันทึกรายการแล้วไม่ขึ้นใน Google Sheet ให้เช็คว่าแชร์ชีตให้ Service Account เป็น Editor แล้วหรือยัง
- ตัวบอทจะตอบเฉพาะ User ID ที่ระบุไว้ใน `AUTHORIZED_TELEGRAM_USER_ID` เท่านั้น หากส่งข้อความแล้วบอทเงียบ ให้เช็คว่าใส่ ID ถูกต้องหรือไม่
