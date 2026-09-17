import { Transaction } from './types.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
  matchedTransaction?: Transaction;
}

export function checkDuplicateTransaction(
  candidate: Partial<Transaction>,
  existingTransactions: Transaction[]
): DuplicateCheckResult {
  for (const existing of existingTransactions) {
    // 1. Check Bank Transaction Reference (Most definitive)
    if (
      candidate.reference &&
      existing.reference &&
      candidate.reference.trim().toLowerCase() === existing.reference.trim().toLowerCase()
    ) {
      return {
        isDuplicate: true,
        reason: `พบเลขอ้างอิงสลิปเดียวกัน (${candidate.reference}) ซึ่งเคยบันทึกไปแล้ว`,
        matchedTransaction: existing,
      };
    }

    // 2. Check Receipt Reference (e.g., Telegram File ID)
    if (
      candidate.receiptReference &&
      existing.receiptReference &&
      candidate.receiptReference === existing.receiptReference
    ) {
      return {
        isDuplicate: true,
        reason: 'รูปสลิปนี้เคยถูกส่งและบันทึกไปแล้ว',
        matchedTransaction: existing,
      };
    }

    // 3. Heuristic match: Same Date + Same Amount + Same Type + Same Merchant/Description
    if (
      candidate.date === existing.date &&
      candidate.amount === existing.amount &&
      candidate.type === existing.type
    ) {
      // Check merchant if both exist
      if (
        candidate.merchant &&
        existing.merchant &&
        candidate.merchant.trim().toLowerCase() === existing.merchant.trim().toLowerCase()
      ) {
        return {
          isDuplicate: true,
          reason: `พบรายการซ้ำ: วันที่ ${candidate.date} ยอด ${candidate.amount} บาท ร้าน ${candidate.merchant}`,
          matchedTransaction: existing,
        };
      }

      // Check exact time match if merchant not specified
      if (candidate.time && existing.time && candidate.time.slice(0, 5) === existing.time.slice(0, 5)) {
        return {
          isDuplicate: true,
          reason: `พบรายการซ้ำในเวลาเดียวกัน: ${candidate.time.slice(0, 5)} ยอด ${candidate.amount} บาท`,
          matchedTransaction: existing,
        };
      }
    }
  }

  return { isDuplicate: false };
}

