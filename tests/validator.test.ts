import { describe, it, expect } from 'vitest';
import { validateTransactionData } from '../src/transactions/validator.js';

describe('Transaction Validator', () => {
  const meta = {
    telegramMessageId: 101,
    createdBy: 'user_12345',
    source: 'text' as const,
    defaultAccount: 'K PLUS',
    todayDateStr: '2026-09-18',
    currentTimeStr: '20:30:00',
  };

  it('accepts valid expense transaction data', () => {
    const result = validateTransactionData(
      {
        type: 'expense',
        amount: 55,
        category: 'อาหาร',
        description: 'ข้าวผัด',
        account: 'K PLUS',
      },
      meta
    );

    expect(result.isValid).toBe(true);
    expect(result.transaction).toBeDefined();
    expect(result.transaction?.amount).toBe(55);
    expect(result.transaction?.type).toBe('expense');
    expect(result.transaction?.category).toBe('อาหาร');
    expect(result.transaction?.description).toBe('ข้าวผัด');
    expect(result.transaction?.date).toBe('2026-09-18');
  });

  it('accepts valid income transaction data', () => {
    const result = validateTransactionData(
      {
        type: 'income',
        amount: 500,
        description: 'เงินโอนจากแม่',
      },
      meta
    );

    expect(result.isValid).toBe(true);
    expect(result.transaction?.type).toBe('income');
    expect(result.transaction?.amount).toBe(500);
    expect(result.transaction?.category).toBe('อื่น ๆ');
    expect(result.transaction?.account).toBe('K PLUS');
  });

  it('rejects zero or negative amounts', () => {
    const zeroResult = validateTransactionData({ type: 'expense', amount: 0 }, meta);
    expect(zeroResult.isValid).toBe(false);
    expect(zeroResult.error).toContain('จำนวนเงินไม่ถูกต้อง');

    const negResult = validateTransactionData({ type: 'expense', amount: -100 }, meta);
    expect(negResult.isValid).toBe(false);
  });

  it('rejects transactions with unclear type', () => {
    const unclearResult = validateTransactionData({ type: 'unclear', amount: 200 }, meta);
    expect(unclearResult.isValid).toBe(false);
    expect(unclearResult.error).toContain('ไม่สามารถระบุประเภทได้');
  });
});

