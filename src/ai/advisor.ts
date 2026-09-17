import { generateContentWithRetry } from './client.js';
import { recordAiRequest } from './tracker.js';

export interface FinancialContext {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  netSavings: number;
  monthlyBudget: number;
  budgetUsedPercent: number | null;
  topCategories: Array<{ category: string; amount: number }>;
  recentTransactions: Array<{ date: string; description: string; amount: number; type: string }>;
}

export const ADVISOR_SYSTEM_INSTRUCTION = `
คุณคือ "WAVON" (วาฟอน) ผู้ช่วยและที่ปรึกษาทางการเงินส่วนตัวอัจฉริยะใน Telegram
บุคลิกของคุณ: เป็นมิตร สุภาพ ฉลาด ตอบตรงประเด็น ให้กำลังใจ และมีอารมณ์ขันเล็กน้อย

หน้าที่ของคุณ:
1. ตอบคำถามเกี่ยวกับการเงิน วางแผนการใช้เงิน หรือคุยเล่นกับผู้ใช้
2. ใช้ข้อมูลการเงินจริงของผู้ใช้ที่ส่งไปให้ในการวิเคราะห์และตอบคำถาม เช่น ยอดคงเหลือ, รายจ่ายเดือนนี้, หมวดหมู่ที่ใช้เยอะสุด, หรืองบประมาณ
3. ให้คำแนะนำที่จับต้องได้จริงในการประหยัดเงิน หรือการบริหารเงินให้ไม่เกินงบ
4. จัดรูปแบบข้อความให้อ่านง่ายบนมือถือ (ใช้ Bullet point, Emoji เหมาะสม, ย่อหน้ากระชับ)
`;

export async function askFinancialAdvisor(
  userQuestion: string,
  context: FinancialContext
): Promise<string> {
  const categoriesText = context.topCategories
    .map((c) => `- ${c.category}: ${c.amount.toLocaleString('th-TH')} บาท`)
    .join('\n');

  const budgetInfo =
    context.monthlyBudget > 0
      ? `งบประมาณเดือนนี้: ${context.monthlyBudget.toLocaleString('th-TH')} บาท (ใช้ไปแล้ว ${context.budgetUsedPercent}%)`
      : 'ยังไม่ได้ตั้งงบประมาณรายเดือน';

  const recentTxnsText = context.recentTransactions
    .slice(0, 5)
    .map((t) => `- [${t.date}] ${t.type === 'expense' ? '💸' : '💰'} ${t.description}: ${t.amount} บาท`)
    .join('\n');

  const prompt = `
บริบททางการเงินปัจจุบันของผู้ใช้ (อ้างอิงจาก Google Sheets):
- ยอดเงินคงเหลือสุทธิ: ${context.currentBalance.toLocaleString('th-TH')} บาท
- รายรับเดือนนี้: +${context.monthlyIncome.toLocaleString('th-TH')} บาท
- รายจ่ายเดือนนี้: -${context.monthlyExpense.toLocaleString('th-TH')} บาท
- เงินเก็บสุทธิเดือนนี้: ${context.netSavings >= 0 ? '+' : ''}${context.netSavings.toLocaleString('th-TH')} บาท
- ${budgetInfo}

หมวดหมู่ค่าใช้จ่ายสูงสุด:
${categoriesText || 'ยังไม่มีข้อมูล'}

รายการล่าสุด:
${recentTxnsText || 'ยังไม่มีข้อมูล'}

คำถามหรือข้อความจากผู้ใช้: "${userQuestion}"

กรุณาตอบคำถามอย่างเป็นธรรมชาติในฐานะที่ปรึกษาทางการเงินส่วนตัว:
`;

  try {
    const response = await generateContentWithRetry({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction: ADVISOR_SYSTEM_INSTRUCTION,
      },
    });

    recordAiRequest();
    return response.text?.trim() || 'ขออภัยครับ ตอนนี้ยังไม่สามารถวิเคราะห์ข้อมูลได้ กรุณาลองใหม่อีกครั้งครับ';
  } catch (error) {
    console.error('[AI Advisor Error]', error);
    return '⚠️ ขออภัยครับ ระบบที่ปรึกษา AI กำลังยุ่งอยู่ชั่วคราว กรุณาลองถามใหม่อีกครั้งในอีกสักครู่นะครับ';
  }
}

