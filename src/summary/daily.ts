import { DailySummary, Transaction } from '../transactions/types.js';
import { calculateBalance } from './balance.js';

export function calculateDailySummary(
  targetDate: string, // YYYY-MM-DD
  allTransactions: Transaction[],
  startingBalance: number
): DailySummary {
  // All transactions up to now to determine current balance
  const balanceInfo = calculateBalance(startingBalance, allTransactions);

  // Filter transactions for target date
  const dayTxns = allTransactions.filter((t) => t.date === targetDate);

  let totalIncome = 0;
  let totalExpense = 0;
  const categories: Record<string, number> = {};

  for (const txn of dayTxns) {
    if (txn.type === 'income') {
      totalIncome += txn.amount;
    } else if (txn.type === 'expense') {
      totalExpense += txn.amount;
      const cat = txn.category || 'อื่น ๆ';
      categories[cat] = Math.round(((categories[cat] || 0) + txn.amount) * 100) / 100;
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const net = Math.round((totalIncome - totalExpense) * 100) / 100;

  return {
    date: targetDate,
    totalIncome,
    totalExpense,
    net,
    currentBalance: balanceInfo.currentBalance,
    categories,
    transactionCount: dayTxns.length,
  };
}

