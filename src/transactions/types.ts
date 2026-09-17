export type TransactionType = 'income' | 'expense';

export type TransactionSource = 'text' | 'receipt' | 'manual';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  account: string;
  source: TransactionSource;
  merchant: string | null;
  reference: string | null;
  telegramMessageId: string | number;
  createdBy: string;
  receiptReference: string | null;
  createdAt: string; // ISO 8601 string
}

export interface ParsedTransactionData {
  intent: 'create_transaction' | 'clarification_needed' | 'unknown';
  type: TransactionType | 'unclear';
  amount: number | null;
  currency: string;
  category: string | null;
  description: string | null;
  merchant: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm:ss
  account: string | null;
  reference: string | null;
  confidence: number;
  clarificationQuestion: string | null;
}

export interface UserSettings {
  telegramUserId: string;
  startingBalance: number;
  monthlyBudget: number;
  defaultAccount: string;
  reminderEnabled: boolean;
  reminderTime: string; // HH:mm
  secondReminderTime: string; // HH:mm
  timezone: string;
  slipMode: 'confirm' | 'auto_save';
  createdAt: string;
  updatedAt: string;
}

export interface DailySummary {
  date: string;
  totalIncome: number;
  totalExpense: number;
  net: number;
  currentBalance: number;
  categories: Record<string, number>;
  transactionCount: number;
}

export interface MonthlySummary {
  month: string; // YYYY-MM
  totalIncome: number;
  totalExpense: number;
  net: number;
  currentBalance: number;
  categories: Record<string, number>;
  transactionCount: number;
  dailyAverageExpense: number;
  maxExpenseDay: {
    date: string;
    amount: number;
  } | null;
}

