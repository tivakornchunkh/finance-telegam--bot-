import { generateContentWithRetry } from './client.js';
import { TRANSACTION_JSON_SCHEMA } from './prompts.js';
import { getConfig } from '../config/config.js';
import { ParsedTransactionData } from '../transactions/types.js';
import { recordAiRequest } from './tracker.js';

export const VOICE_SYSTEM_INSTRUCTION = `
คุณคือ AI ผู้ช่วยฟังเสียงบันทึกการเงินส่วนบุคคล (Thai Voice Expense Tracker)
หน้าที่ของคุณคือฟังเสียงพูดภาษาไทยของผู้ใช้ แล้วสกัดข้อมูลทางการเงินออกมาเป็น JSON Structured Data ตาม schema ที่กำหนด

กฎเหล็ก (Critical Rules):
1. **จับใจความจำนวนเงิน**: ฟังตัวเลขจำนวนเงินภาษาไทยให้แม่นยำ เช่น "ห้าสิบบาท" = 50, "แปดร้อย" = 800, "พันสอง" = 1200
2. **ประเภทรายการ**:
   - ถ้าพูดว่า "จ่าย", "ซื้อ", "กิน", "เติม", "โอนให้" = expense
   - ถ้าพูดว่า "ได้", "รับ", "เงินเข้า", "คืนเงิน" = income
   - หากไม่ชัดเจน ให้ตั้ง type: "unclear" และถามใน clarificationQuestion
3. **หมวดหมู่ (Category)**: แมปเข้าหมวดหมู่ที่เหมาะสมที่สุด เช่น อาหาร, เดินทาง / น้ำมัน, ความบันเทิง ฯลฯ
4. **ห้ามเดาตัวเลข**: หากเสียงไม่ชัดเจน หรือไม่ได้พูดถึงจำนวนเงิน ให้ตั้ง intent: "clarification_needed" และถามยอดเงิน
`;

export async function parseVoiceMessage(
  audioBuffer: Buffer,
  mimeType: string,
  categories: string[],
  todayDateStr: string
): Promise<ParsedTransactionData> {
  const config = getConfig();
  const base64Audio = audioBuffer.toString('base64');

  const userPrompt = `
กรุณาฟังเสียงพูดภาษาไทยนี้แล้วสกัดข้อมูลรายการการเงิน:
วันที่ปัจจุบัน: ${todayDateStr}
หมวดหมู่ที่รองรับ: ${categories.join(', ')}
บัญชีเริ่มต้น: ${config.DEFAULT_ACCOUNT}

จงวิเคราะห์เสียงและส่งกลับมาเป็น JSON ตาม schema ที่กำหนดอย่างเคร่งครัด
`;

  try {
    const response = await generateContentWithRetry({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: mimeType || 'audio/ogg',
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      ],
      config: {
        systemInstruction: VOICE_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: TRANSACTION_JSON_SCHEMA as any,
      },
    });

    recordAiRequest();

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText) as Partial<ParsedTransactionData>;

    return {
      intent: parsed.intent || 'create_transaction',
      type: parsed.type || 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      currency: parsed.currency || 'THB',
      category: parsed.category || 'อาหาร',
      description: parsed.description || 'บันทึกผ่านเสียงพูด',
      merchant: parsed.merchant || null,
      date: parsed.date || todayDateStr,
      time: parsed.time || null,
      account: parsed.account || config.DEFAULT_ACCOUNT,
      reference: parsed.reference || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      clarificationQuestion: parsed.intent === 'clarification_needed' ? (parsed.clarificationQuestion || null) : null,
    };
  } catch (error) {
    console.error('[AI Voice Error]', error);
    return {
      intent: 'clarification_needed',
      type: 'unclear',
      amount: null,
      currency: 'THB',
      category: null,
      description: null,
      merchant: null,
      date: todayDateStr,
      time: null,
      account: config.DEFAULT_ACCOUNT,
      reference: null,
      confidence: 0,
      clarificationQuestion: '⚠️ ฟังเสียงไม่ชัดเจน กรุณาลองอัดเสียงใหม่อีกครั้ง หรือพิมพ์เป็นข้อความครับ',
    };
  }
}

