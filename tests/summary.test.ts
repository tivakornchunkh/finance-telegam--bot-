import { describe, it, expect } from 'vitest';
import { calculateBalance } from '../src/summary/balance.js';
import { calculateDailySummary } from '../src/summary/daily.js';
import { calculateMonthlySummary } from '../src/summary/monthly.js';
import { Transaction } from '../src/transactions/types.js';

describe('Financial Summary Calculations', () => {
  const transactions: Transaction[] = [
    {
      id: 'TXN-01',
      date: '2026-09-18',
      time: '08:00:00',
      type: 'expense',
      amount: 55,
      category: 'อาหาร',
      description: 'ข้าวแกง',
      account: 'K PLUS',
      source: 'text',
      merchant: null,
      reference: null,
      telegramMessageId: 1,
      createdBy: 'user',
      receiptReference: null,
      createdAt: '2026-09-18T08:00:00Z',
    },
    {
      id: 'TXN-02',
      date: '2026-09-18',
      time: '12:30:00',
      type: 'expense',
      amount: 120,
      category: 'อาหาร',
      description: 'ก๋วยเตี๋ยว',
      account: 'K PLUS',
      source: 'text',
      merchant: null,
      reference: null,
      telegramMessageId: 2,
      createdBy: 'user',
      receiptReference: null,
      createdAt: '2026-09-18T12:30:00Z',
    },
    {
      id: 'TXN-03',
      date: '2026-09-18',
      time: '14:00:00',
      type: 'income',
      amount: 1000,
      category: 'อื่น ๆ',
      description: 'เงินโอนเข้า',
      account: 'K PLUS',
      source: 'text',
      merchant: null,
      reference: null,
      telegramMessageId: 3,
      createdBy: 'user',
      receiptReference: null,
      createdAt: '2026-09-18T14:00:00Z',
    },
    {
      id: 'TXN-04',
      date: '2026-09-17',
      time: '18:00:00',
      type: 'expense',
      amount: 300,
      category: 'เดินทาง / น้ำมัน',
      description: 'เติมน้ำมัน',
      account: 'K PLUS',
      source: 'text',
      merchant: null,
      reference: null,
      telegramMessageId: 4,
      createdBy: 'user',
      receiptReference: null,
      createdAt: '2026-09-17T18:00:00Z',
    },
  ];

  const startingBalance = 5000;

  it('calculates current balance correctly (starting + income - expense)', () => {
    const result = calculateBalance(startingBalance, transactions);
    // Total income: 1000
    // Total expense: 55 + 120 + 300 = 475
    // Balance: 5000 + 1000 - 475 = 5525
    expect(result.totalIncome).toBe(1000);
    expect(result.totalExpense).toBe(475);
    expect(result.currentBalance).toBe(5525);
  });

  it('calculates daily summary with net and category grouping', () => {
    const daily = calculateDailySummary('2026-09-18', transactions, startingBalance);
    // Day income: 1000
    // Day expense: 175 (อาหาร: 175)
    // Net: +825
    expect(daily.totalIncome).toBe(1000);
    expect(daily.totalExpense).toBe(175);
    expect(daily.net).toBe(825);
    expect(daily.categories['อาหาร']).toBe(175);
    expect(daily.transactionCount).toBe(3);
    expect(daily.currentBalance).toBe(5525);
  });

  it('calculates monthly summary with daily average and peak expense day', () => {
    const monthly = calculateMonthlySummary('2026-09', transactions, startingBalance);
    expect(monthly.totalIncome).toBe(1000);
    expect(monthly.totalExpense).toBe(475);
    expect(monthly.net).toBe(525);
    expect(monthly.transactionCount).toBe(4);
    // Day 2026-09-17 has 300 expense, 2026-09-18 has 175 expense
    expect(monthly.maxExpenseDay?.date).toBe('2026-09-17');
    expect(monthly.maxExpenseDay?.amount).toBe(300);
    expect(monthly.categories['อาหาร']).toBe(175);
    expect(monthly.categories['เดินทาง / น้ำมัน']).toBe(300);
  });
});

