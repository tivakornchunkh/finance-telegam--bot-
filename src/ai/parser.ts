import { getGeminiClient, generateContentWithRetry } from './client.js';
import { PARSER_SYSTEM_INSTRUCTION, TRANSACTION_JSON_SCHEMA } from './prompts.js';
import { getConfig } from '../config/config.js';
import { ParsedTransactionData } from '../transactions/types.js';
import { recordAiRequest } from './tracker.js';

export async function parseTransactionText(
  userText: string,
  categories: string[],
  todayDateStr: string
): Promise<ParsedTransactionData> {
  const config = getConfig();
  const ai = getGeminiClient();

  const userPrompt = `
ข้อความจากผู้ใช้: "${userText}"
วันที่ปัจจุบัน: ${todayDateStr}
หมวดหมู่ที่รองรับ: ${categories.join(', ')}
บัญชีเริ่มต้น: ${config.DEFAULT_ACCOUNT}

จงวิเคราะห์ข้อความด้านบนและส่งกลับมาเป็น JSON ตาม schema ที่กำหนดอย่างเคร่งครัด
`;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: PARSER_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: TRANSACTION_JSON_SCHEMA as any,
      },
    });

    recordAiRequest();

    const responseText = response.text?.trim() || '{}';
    const parsed = JSON.parse(responseText) as Partial<ParsedTransactionData>;

    return {
      intent: parsed.intent || 'unknown',
      type: parsed.type || 'unclear',
      amount: typeof parsed.amount === 'number' ? parsed.amount : null,
      currency: parsed.currency || 'THB',
      category: parsed.category || null,
      description: parsed.description || null,
      merchant: parsed.merchant && !parsed.merchant.includes('\n') && parsed.merchant.toLowerCase() !== 'reference' ? parsed.merchant.trim() : null,
      date: parsed.date || todayDateStr,
      time: parsed.time || null,
      account: parsed.account || config.DEFAULT_ACCOUNT,
      reference: parsed.reference || null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8,
      clarificationQuestion: parsed.intent === 'clarification_needed' ? (parsed.clarificationQuestion || null) : null,
    };
  } catch (error) {
    console.error('[AI Parser Error]', error);
    // Graceful rule-based fallback for simple expressions if AI API fails or is offline
    return tryRuleBasedFallback(userText, todayDateStr, config.DEFAULT_ACCOUNT);
  }
}

/**
 * Lightweight fallback for offline tests or transient network drops.
 */
function tryRuleBasedFallback(text: string, today: string, defaultAccount: string): ParsedTransactionData {
  const clean = text.trim();
  const amountMatch = clean.match(/(\d+(\.\d+)?)/);
  if (!amountMatch) {
    return {
      intent: 'clarification_needed',
      type: 'unclear',
      amount: null,
      currency: 'THB',
      category: null,
      description: null,
      merchant: null,
      date: today,
      time: null,
      account: defaultAccount,
      reference: null,
      confidence: 0.1,
      clarificationQuestion: 'วันนี้มีรายการกี่บาท และเป็นค่าอะไรครับ?',
    };
  }

  const amount = parseFloat(amountMatch[1]);
  const isIncome = /ได้|รับ|เงินเข้า|โอนเข้า|คืน/.test(clean);
  const isExpense = /จ่าย|ซื้อ|โอน|ค่า|กิน|เติม/.test(clean);

  return {
    intent: 'create_transaction',
    type: isIncome ? 'income' : isExpense ? 'expense' : 'expense',
    amount,
    currency: 'THB',
    category: 'อาหาร',
    description: clean.replace(amountMatch[0], '').trim() || 'รายการทั่วไป',
    merchant: null,
    date: today,
    time: null,
    account: defaultAccount,
    reference: null,
    confidence: 0.7,
    clarificationQuestion: null,
  };
}

