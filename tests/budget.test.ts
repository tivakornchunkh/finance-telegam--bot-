import { describe, it, expect } from 'vitest';
import { checkBudgetAlert } from '../src/bot/handlers.js';
import { UserSettings } from '../src/transactions/types.js';

describe('Budget Alerts & Calculations', () => {
  const baseSettings: UserSettings = {
    telegramUserId: '12345',
    startingBalance: 10000,
    monthlyBudget: 5000,
    defaultAccount: 'K PLUS',
    reminderEnabled: true,
    reminderTime: '20:00',
    secondReminderTime: '22:00',
    timezone: 'Asia/Bangkok',
    slipMode: 'confirm',
    createdAt: '2026-09-18T00:00:00Z',
    updatedAt: '2026-09-18T00:00:00Z',
  };

  it('returns null when budget is not set (0)', () => {
    const noBudgetSettings = { ...baseSettings, monthlyBudget: 0 };
    const alert = checkBudgetAlert(noBudgetSettings, 4000);
    expect(alert).toBeNull();
  });

  it('returns null when spending is below 80%', () => {
    const alert = checkBudgetAlert(baseSettings, 3500); // 70%
    expect(alert).toBeNull();
  });

  it('returns warning when spending reaches 80% to 99%', () => {
    const alert = checkBudgetAlert(baseSettings, 4200); // 84%
    expect(alert).not.toBeNull();
    expect(alert).toContain('แตะ 84% ของงบประมาณ');
  });

  it('returns critical alert when spending exceeds 100%', () => {
    const alert = checkBudgetAlert(baseSettings, 5500); // 110%
    expect(alert).not.toBeNull();
    expect(alert).toContain('ใช้จ่ายทะลุงบประมาณเดือนนี้แล้ว');
  });
});

