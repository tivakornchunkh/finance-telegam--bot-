import { getGoogleSheetsClient, TRANSACTION_HEADERS } from './client.js';
import { getConfig } from '../config/config.js';
import { Transaction, TransactionSource, TransactionType } from '../transactions/types.js';

export async function appendTransaction(txn: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  const now = new Date();
  const dateCompact = txn.date.replace(/-/g, '');
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const id = `TXN-${dateCompact}-${randomSuffix}`;
  const createdAt = now.toISOString();

  const row = [
    id,
    txn.date,
    txn.time,
    txn.type,
    txn.amount,
    txn.category,
    txn.description,
    txn.account,
    txn.source,
    txn.merchant || '',
    txn.reference || '',
    txn.telegramMessageId.toString(),
    txn.createdBy,
    txn.receiptReference || '',
    createdAt,
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Transactions!A:O',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [row],
    },
  });

  return {
    ...txn,
    id,
    createdAt,
  };
}

export async function getAllTransactions(): Promise<Transaction[]> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Transactions!A2:O',
  });

  const rows = res.data.values || [];
  return rows.map((row) => ({
    id: row[0] || '',
    date: row[1] || '',
    time: row[2] || '',
    type: (row[3] || 'expense') as TransactionType,
    amount: parseFloat(row[4]) || 0,
    category: row[5] || 'อื่น ๆ',
    description: row[6] || '',
    account: row[7] || 'K PLUS',
    source: (row[8] || 'text') as TransactionSource,
    merchant: row[9] || null,
    reference: row[10] || null,
    telegramMessageId: row[11] || '',
    createdBy: row[12] || '',
    receiptReference: row[13] || null,
    createdAt: row[14] || '',
  }));
}

export async function deleteTransactionById(id: string): Promise<boolean> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Transactions!A2:A',
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((row) => row[0] === id);
  if (rowIndex === -1) return false;

  // The actual row number in the sheet is rowIndex + 2 (1-indexed, header is row 1)
  const actualRow = rowIndex + 2;

  // Clear row content
  await sheets.spreadsheets.values.clear({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: `Transactions!A${actualRow}:O${actualRow}`,
  });

  return true;
}

export async function getLatestTransactionByUser(userId: string): Promise<Transaction | null> {
  const txns = await getAllTransactions();
  const userTxns = txns.filter((t) => t.createdBy === userId && t.id.trim() !== '');
  return userTxns.length > 0 ? userTxns[userTxns.length - 1] : null;
}

