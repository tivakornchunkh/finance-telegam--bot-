import { Transaction } from '../transactions/types.js';

/**
 * Calculates current balance based on starting balance + total income - total expense.
 */
export function calculateBalance(
  startingBalance: number,
  transactions: Transaction[]
): {
  startingBalance: number;
  totalIncome: number;
  totalExpense: number;
  currentBalance: number;
} {
  let totalIncome = 0;
  let totalExpense = 0;

  for (const txn of transactions) {
    if (txn.type === 'income') {
      totalIncome += txn.amount;
    } else if (txn.type === 'expense') {
      totalExpense += txn.amount;
    }
  }

  // Round to 2 decimal places to avoid IEEE floating point errors
  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const currentBalance = Math.round((startingBalance + totalIncome - totalExpense) * 100) / 100;

  return {
    startingBalance,
    totalIncome,
    totalExpense,
    currentBalance,
  };
}

