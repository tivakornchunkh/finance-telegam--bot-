import { getGeminiClient, generateContentWithRetry } from './client.js';
import { SLIP_VISION_SYSTEM_INSTRUCTION, TRANSACTION_JSON_SCHEMA } from './prompts.js';
import { getConfig } from '../config/config.js';
import { ParsedTransactionData } from '../transactions/types.js';
import { recordAiRequest } from './tracker.js';

export async function parseSlipImage(
  imageBuffer: Buffer,
  mimeType: string,
  userCaption: string | null,
  categories: string[],
  todayDateStr: string
): Promise<ParsedTransactionData> {
  const config = getConfig();
  const ai = getGeminiClient();

  const base64Image = imageBuffer.toString('base64');

  const captionPrompt = userCaption
    ? `ข้อความเพิ่มเติมจากผู้ใช้: "${userCaption}"`
    : 'ผู้ใช้ไม่ได้ส่งข้อความเพิ่มเติม';

  const userPrompt = `
กรุณาอ่านข้อมูลจากรูปภาพสลิปโอนเงินนี้:
${captionPrompt}
วันที่ปัจจุบัน: ${todayDateStr}
หมวดหมู่ที่รองรับ: ${categories.join(', ')}
บัญชีเริ่มต้น: ${config.DEFAULT_ACCOUNT}

จงวิเคราะห์รูปสลิปและส่งกลับมาเป็น JSON ตาม schema ที่กำหนดอย่างเคร่งครัด
หากภาพไม่ชัด หรืออ่านจำนวนเงินไม่ได้ ให้ตั้ง intent: "clarification_needed", amount: null และระบุเหตุผลใน clarificationQuestion
`;

  try {
    const response = await generateContentWithRetry({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType || 'image/jpeg',
              },
            },
            {
              text: userPrompt,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SLIP_VISION_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: TRANSACTION_JSON_SCHEMA as any,
      },
    });

    recordAiRequest();

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText) as Partial<ParsedTransactionData>;

    return {
      intent: parsed.intent || 'unknown',
      type: parsed.type || 'expense',
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      currency: parsed.currency || 'THB',
      category: parsed.category || 'อาหาร',
      description: parsed.description || userCaption || 'โอนเงิน',
      merchant: parsed.merchant || null,
      date: parsed.date || todayDateStr,
      time: parsed.time || null,
      account: parsed.account || config.DEFAULT_ACCOUNT,
      reference: parsed.reference || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.85,
      clarificationQuestion: parsed.clarificationQuestion || null,
    };
  } catch (error) {
    console.error('[AI Slip Vision Error]', error);
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
      clarificationQuestion: '⚠️ ไม่สามารถเชื่อมต่อระบบ AI ได้ชั่วคราว หรือภาพไม่ชัดเจน กรุณาลองใหม่อีกครั้งครับ',
    };
  }
}

