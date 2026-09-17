import { describe, it, expect } from 'vitest';
import { checkDuplicateTransaction } from '../src/transactions/duplicate.js';
import { Transaction } from '../src/transactions/types.js';

describe('Duplicate Transaction Checker', () => {
  const existingList: Transaction[] = [
    {
      id: 'TXN-001',
      date: '2026-09-18',
      time: '19:30:00',
      type: 'expense',
      amount: 185,
      category: 'อาหาร',
      description: 'ข้าวต้ม',
      account: 'K PLUS',
      source: 'receipt',
      merchant: 'ร้านข้าวต้ม A',
      reference: 'KBANK-987654321',
      telegramMessageId: 11,
      createdBy: 'user_1',
      receiptReference: 'file_id_abc',
      createdAt: '2026-09-18T19:30:00Z',
    },
  ];

  it('detects duplicate by bank reference code', () => {
    const candidate = {
      reference: 'KBANK-987654321',
      amount: 185,
      date: '2026-09-18',
    };
    const result = checkDuplicateTransaction(candidate, existingList);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toContain('พบเลขอ้างอิงสลิปเดียวกัน');
  });

  it('detects duplicate by receipt file id', () => {
    const candidate = {
      receiptReference: 'file_id_abc',
      amount: 185,
      date: '2026-09-18',
    };
    const result = checkDuplicateTransaction(candidate, existingList);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toContain('รูปสลิปนี้เคยถูกส่งและบันทึกไปแล้ว');
  });

  it('detects heuristic duplicate with matching date, amount, type, and merchant', () => {
    const candidate = {
      date: '2026-09-18',
      amount: 185,
      type: 'expense' as const,
      merchant: 'ร้านข้าวต้ม A',
    };
    const result = checkDuplicateTransaction(candidate, existingList);
    expect(result.isDuplicate).toBe(true);
    expect(result.reason).toContain('พบรายการซ้ำ');
  });

  it('passes unique non-duplicate transactions', () => {
    const candidate = {
      date: '2026-09-18',
      amount: 75,
      type: 'expense' as const,
      merchant: 'Starbucks',
      reference: 'KBANK-111111111',
    };
    const result = checkDuplicateTransaction(candidate, existingList);
    expect(result.isDuplicate).toBe(false);
  });
});

