import { MonthlySummary, Transaction } from '../transactions/types.js';
import { calculateBalance } from './balance.js';

export function calculateMonthlySummary(
  targetMonth: string, // YYYY-MM
  allTransactions: Transaction[],
  startingBalance: number
): MonthlySummary {
  const balanceInfo = calculateBalance(startingBalance, allTransactions);

  const monthTxns = allTransactions.filter((t) => t.date.startsWith(targetMonth));

  let totalIncome = 0;
  let totalExpense = 0;
  const categories: Record<string, number> = {};
  const dailyExpenses: Record<string, number> = {};

  for (const txn of monthTxns) {
    if (txn.type === 'income') {
      totalIncome += txn.amount;
    } else if (txn.type === 'expense') {
      totalExpense += txn.amount;
      const cat = txn.category || 'อื่น ๆ';
      categories[cat] = Math.round(((categories[cat] || 0) + txn.amount) * 100) / 100;

      // Group by day to find max expense day
      dailyExpenses[txn.date] = Math.round(((dailyExpenses[txn.date] || 0) + txn.amount) * 100) / 100;
    }
  }

  totalIncome = Math.round(totalIncome * 100) / 100;
  totalExpense = Math.round(totalExpense * 100) / 100;
  const net = Math.round((totalIncome - totalExpense) * 100) / 100;

  // Find max expense day
  let maxExpenseDay: { date: string; amount: number } | null = null;
  for (const [date, amount] of Object.entries(dailyExpenses)) {
    if (!maxExpenseDay || amount > maxExpenseDay.amount) {
      maxExpenseDay = { date, amount };
    }
  }

  // Daily average expense (days with expense or total days elapsed in month)
  const uniqueDays = Object.keys(dailyExpenses).length;
  const dailyAverageExpense = uniqueDays > 0 ? Math.round((totalExpense / uniqueDays) * 100) / 100 : 0;

  return {
    month: targetMonth,
    totalIncome,
    totalExpense,
    net,
    currentBalance: balanceInfo.currentBalance,
    categories,
    transactionCount: monthTxns.length,
    dailyAverageExpense,
    maxExpenseDay,
  };
}

