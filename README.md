# Telegram Finance Bot 🤖💸

บอทบันทึกรายรับ-รายจ่ายส่วนตัวบน Telegram เชื่อมต่อกับ **Google Sheets** โดยตรง และใช้ **Google Gemini AI** ช่วยอ่านสลิปธนาคาร ถอดเสียงพูด และคุยตอบคำถามเรื่องการเงิน

ไม่ต้องเปิด Web App ให้ยุ่งยาก แค่แชทกับบอทใน Telegram ข้อมูลก็บันทึกลง Google Sheet ทันที

---

## ✨ บอททำอะไรได้บ้าง?

- 🧾 **อ่านสลิปโอนเงินอัตโนมัติ:** ส่งรูปสลิปธนาคารไทย (K PLUS, SCB, Krungthai, เป๋าตัง ฯลฯ) บอทจะดึงยอดเงิน วันที่ เวลา และเลขอ้างอิงลงชีตให้ทันที
- 🎙️ **สั่งงานด้วยเสียง:** ขี้เกียจพิมพ์ก็กดอัดเสียงส่ง เช่น *"จ่ายค่าข้าว 60 บาท"* AI ฟังภาษาไทยรู้เรื่อง
- 📝 **พิมพ์ภาษาพูดธรรมดา:** เช่น `ข้าวผัด 50`, `จ่ายค่าน้ำ 120`, `แม่โอนให้ 500` บอทแยกหมวดหมู่และทิศทางเงินให้เอง
- 📈 **ดูกราฟค่าใช้จ่าย:** พิมพ์ `/chart` บอทจะวาด Pie Chart สรุปหมวดหมู่เงินที่จ่ายไปในเดือนนั้นเป็นรูปภาพส่งมาให้
- 🎯 **ตั้งงบประมาณรายเดือน:** กำหนดงบด้วย `/setbudget 15000` มีแถบ Progress Bar เช็คได้ตลอดเวลา และเตือนเมื่อใช้เงินแตะ 80% หรือเกิน 100%
- 🧠 **คุยปรึกษาเรื่องการเงิน:** พิมพ์ถามคุยเล่นได้ เช่น *"เดือนนี้ใช้เงินเยอะมั้ย"*, *"ช่วยแนะนำวิธีประหยัดเงินหน่อย"* บอทจะดึงสถิติจริงในชีตมาช่วยวิเคราะห์
- ⚡ **โหมด Auto-Save:** สลับโหมดด้วย `/mode` ให้บันทึกลงชีตทันที หรือจะให้ส่งปุ่มมาให้กดยืนยันก่อนก็ได้
- 🛡️ **ระบบป้องกันคนอื่นมาใช้:** ล็อกสิทธิ์เฉพาะ Telegram ID ของเราคนเดียว คนอื่นทักมาบอทจะไม่ตอบ

---

## 🛠️ สิ่งที่ต้องเตรียมล่วงหน้า (ฟรีทั้งหมด)

1. **Node.js** (แนะนำเวอร์ชัน 20 ขึ้นไป)
2. **Telegram Bot Token** จาก `@BotFather`
3. **Telegram User ID ของตัวเอง** ดูได้จาก `@userinfobot`
4. **Google Gemini API Key** ขอฟรีได้ที่ [Google AI Studio](https://aistudio.google.com/)
5. **Google Sheet + Service Account** สำหรับเป็นฐานข้อมูล (มีวิธีทำด้านล่าง)

---

## 🚀 วิธีติดตั้งและรันบอท

### 1. โคลนโปรเจกต์และติดตั้ง Library

```bash
git clone https://github.com/tivakornchunkh/finance-telegam--bot-.git
cd finance-telegam--bot-
npm install
```

---

### 2. เตรียม Google Sheet และ Service Account

1. ไปที่ [Google Cloud Console](https://console.cloud.google.com/) สร้างโปรเจกต์ใหม่
2. เข้าเมนู **APIs & Services > Library** ค้นหาและกด **Enable "Google Sheets API"**
3. ไปที่ **IAM & Admin > Service Accounts** กด **Create Service Account** ตั้งชื่อแล้วกดสร้าง
4. คลิกเข้าไปที่ Service Account ที่เพิ่งสร้าง > ไปที่แท็บ **Keys** > กด **Add Key > Create new key (เลือก JSON)**
5. ไฟล์จะโหลดลงเครื่อง ให้เปลี่ยนชื่อไฟล์เป็น `service-account.json` แล้วเอามาวางไว้ในโฟลเดอร์หลักของโปรเจกต์
6. สร้าง [Google Sheet](https://sheets.new) เปล่าๆ ขึ้นมา 1 ไฟล์
7. กดปุ่ม **แชร์ (Share)** มุมขวาบน นำ**อีเมลของ Service Account** (ที่ลงท้ายด้วย `@...iam.gserviceaccount.com`) มาใส่ และให้สิทธิ์เป็น **Editor**
8. คัดลอก **Sheet ID** จาก URL ของ Google Sheet:
   `https://docs.google.com/spreadsheets/d/`**`ตรงนี้คือ_SHEET_ID`**`/edit`

---

### 3. ตั้งค่าไฟล์ `.env`

คัดลอกไฟล์ตัวอย่าง `.env.example` มาเป็น `.env`:

```bash
cp .env.example .env
```

จากนั้นเปิดไฟล์ `.env` แล้วกรอกค่าของคุณ:

```env
TELEGRAM_BOT_TOKEN=ใส่_Bot_Token_จาก_BotFather
AUTHORIZED_TELEGRAM_USER_ID=ใส่_User_ID_ของคุณ
GEMINI_API_KEY=ใส่_Gemini_API_Key
GOOGLE_SHEET_ID=ใส่_Google_Sheet_ID
GOOGLE_SERVICE_ACCOUNT_KEY_FILE=./service-account.json
TIMEZONE=Asia/Bangkok
```

*(หรือจะรันคำสั่ง `npm run setup` เพื่อให้ระบบ Wizard ช่วยถามและกรอกค่าให้ทีละข้อก็ได้)*

---

### 4. สั่งรันบอท

```bash
# คอมไพล์โค้ด
npm run build

# รันบอท
npm start
```

ถ้าขึ้นข้อความ:
`[Ready] Bot @your_bot is running and listening for messages!`  
แปลว่าบอทพร้อมใช้งานแล้ว ทักไปเล่นใน Telegram ได้เลย!

---

## 📱 คำสั่งที่ใช้บ่อยใน Telegram

| คำสั่ง | สิ่งที่บอทจะตอบ |
| :--- | :--- |
| `/start` | แนะนำตัวและเช็คยอดเงินเริ่มต้น |
| `/today` | สรุปรายรับ-รายจ่ายของวันนี้ |
| `/month` | สรุปยอดรวมประจำเดือน |
| `/chart` | สรุปเป็นรูปภาพกราฟวงกลม (Pie Chart) |
| `/balance` | ดูยอดเงินคงเหลือสุทธิปัจจุบัน |
| `/budget` | ดูความคืบหน้างบประมาณประจำเดือน |
| `/setbudget 15000` | ตั้งงบประมาณเดือนนี้เป็น 15,000 บาท |
| `/mode` | สลับโหมด บันทึกทันที (Auto-Save) หรือ รอกดยืนยัน (Confirm) |
| `/setbalance 5000` | ตั้งค่ายอดเงินสดเริ่มต้น |
| `/limits` | เช็คโควต้า Gemini AI และจำนวนครั้งที่บันทึกลงชีตวันนี้ |
| `/delete` | ขอลบรายการล่าสุดที่เพิ่งบันทึก |
| `/export` | ขอไฟล์ Excel/CSV ข้อมูลทั้งหมด |

---

## ⚠️ ปัญหาที่พบบ่อย (Troubleshooting)

- **บอทบอกบันทึกแล้ว แต่ใน Sheet ไม่มีข้อมูล:**  
  ตรวจดูว่าได้กดแชร์ชีตให้อีเมล Service Account เป็น **Editor** แล้วหรือยัง และตรวจสอบ `GOOGLE_SHEET_ID` ใน `.env` ว่าตรงกับชีตที่เปิดอยู่ไหม
- **บอทไม่ยอมตอบข้อความ:**  
  ตรวจดูว่า Telegram ID ของคุณใน `.env` (`AUTHORIZED_TELEGRAM_USER_ID`) ตรงกับตัวเลขที่ได้จาก `@userinfobot` หรือไม่ ถ้าไม่ตรงบอทจะไม่ตอบเพื่อความปลอดภัย
- **อยากรันบอททิ้งไว้ตลอด:**  
  ถ้าเปิดคอมทิ้งไว้ สามารถใช้เครื่องมือพวก `pm2` รันพื้นหลังได้ (`npm install -g pm2` แล้วรัน `pm2 start dist/src/index.js --name "tele-bot"`)

---

## 📄 License
MIT License - เอาไปปรับแต่งและใช้งานได้ฟรีตามสบายครับ
