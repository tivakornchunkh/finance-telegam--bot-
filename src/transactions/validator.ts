import { ParsedTransactionData, Transaction, TransactionType } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  transaction?: Omit<Transaction, 'id' | 'createdAt'>;
}

export function validateTransactionData(
  parsed: Partial<ParsedTransactionData>,
  meta: {
    telegramMessageId: string | number;
    createdBy: string;
    source: 'text' | 'receipt' | 'manual';
    defaultAccount?: string;
    todayDateStr: string; // YYYY-MM-DD
    currentTimeStr: string; // HH:mm:ss
  }
): ValidationResult {
  // Check amount
  if (typeof parsed.amount !== 'number' || isNaN(parsed.amount) || parsed.amount <= 0) {
    return {
      isValid: false,
      error: 'จำนวนเงินไม่ถูกต้อง หรือยังไม่ได้ระบุจำนวนเงิน',
    };
  }

  // Check type
  if (parsed.type !== 'income' && parsed.type !== 'expense') {
    return {
      isValid: false,
      error: 'ไม่สามารถระบุประเภทได้ว่าเป็นรายรับหรือรายจ่าย กรุณาระบุให้ชัดเจน',
    };
  }

  const category = (parsed.category || 'อื่น ๆ').trim();
  const description = (parsed.description || category || 'ไม่มีรายละเอียด').trim();
  const account = (parsed.account || meta.defaultAccount || 'K PLUS').trim();
  const date = parsed.date && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : meta.todayDateStr;
  const time = parsed.time && /^\d{2}:\d{2}(:\d{2})?$/.test(parsed.time) ? parsed.time : meta.currentTimeStr;

  return {
    isValid: true,
    transaction: {
      date,
      time,
      type: parsed.type as TransactionType,
      amount: Math.round(parsed.amount * 100) / 100,
      category,
      description,
      account,
      source: meta.source,
      merchant: parsed.merchant || null,
      reference: parsed.reference || null,
      telegramMessageId: meta.telegramMessageId,
      createdBy: meta.createdBy,
      receiptReference: null,
    },
  };
}

