import { google, sheets_v4 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { getConfig } from '../config/config.js';

let sheetsInstance: sheets_v4.Sheets | null = null;

export async function getGoogleSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsInstance) {
    return sheetsInstance;
  }

  const config = getConfig();
  let authClient;

  if (config.GOOGLE_SERVICE_ACCOUNT_JSON) {
    // Auth directly from stringified or base64 JSON in env
    let rawStr = config.GOOGLE_SERVICE_ACCOUNT_JSON.trim();
    if (!rawStr.startsWith('{')) {
      try {
        rawStr = Buffer.from(rawStr, 'base64').toString('utf-8');
      } catch (err) {
        console.warn('[Sheets Auth] Failed to base64 decode GOOGLE_SERVICE_ACCOUNT_JSON, using as-is.');
      }
    }
    const credentials = JSON.parse(rawStr);
    const privateKey = credentials.private_key?.replace(/\\n/g, '\n');
    authClient = new google.auth.JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } else {
    // Auth from file path
    const keyPath = path.resolve(process.cwd(), config.GOOGLE_SERVICE_ACCOUNT_KEY_FILE);
    if (!fs.existsSync(keyPath)) {
      throw new Error(
        `Google Service Account key file not found at: ${keyPath}. Please check GOOGLE_SERVICE_ACCOUNT_KEY_FILE in .env.`
      );
    }
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf-8'));
    authClient = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }

  sheetsInstance = google.sheets({ version: 'v4', auth: authClient });
  return sheetsInstance;
}

export const TRANSACTION_HEADERS = [
  'ID',
  'Date',
  'Time',
  'Type',
  'Amount',
  'Category',
  'Description',
  'Account',
  'Source',
  'Merchant',
  'Reference',
  'TelegramMessageID',
  'CreatedBy',
  'ReceiptReference',
  'CreatedAt',
];

export const SETTINGS_HEADERS = [
  'TelegramUserID',
  'StartingBalance',
  'MonthlyBudget',
  'DefaultAccount',
  'ReminderEnabled',
  'ReminderTime',
  'SecondReminderTime',
  'Timezone',
  'SlipMode',
  'CreatedAt',
  'UpdatedAt',
];

export const CATEGORIES_HEADERS = ['ID', 'CategoryName', 'Enabled', 'CreatedAt'];

export const DEFAULT_CATEGORIES = [
  'อาหาร',
  'เดินทาง / น้ำมัน',
  'ที่พัก / ค่าไฟ / ค่าน้ำ',
  'เทคโนโลยี / ซอฟต์แวร์',
  'แบดมินตัน / กีฬา',
  'ของขวัญ / แฟน',
  'ความบันเทิง',
  'ช้อปปิ้ง',
  'เงินออม',
  'อื่น ๆ',
];

/**
 * Initializes required sheets and headers if they do not exist.
 */
export async function initializeSpreadsheet(): Promise<void> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  const metadata = await sheets.spreadsheets.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
  });

  const existingSheetNames = metadata.data.sheets?.map((s) => s.properties?.title || '') || [];

  const requests: sheets_v4.Schema$Request[] = [];

  // 1. Check Transactions sheet
  if (!existingSheetNames.includes('Transactions')) {
    requests.push({
      addSheet: { properties: { title: 'Transactions' } },
    });
  }

  // 2. Check Settings sheet
  if (!existingSheetNames.includes('Settings')) {
    requests.push({
      addSheet: { properties: { title: 'Settings' } },
    });
  }

  // 3. Check Categories sheet
  if (!existingSheetNames.includes('Categories')) {
    requests.push({
      addSheet: { properties: { title: 'Categories' } },
    });
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      requestBody: { requests },
    });
    console.log('[Sheets] Created missing sheets successfully.');
  }

  // Write headers if empty
  await ensureHeader(sheets, config.GOOGLE_SHEET_ID, 'Transactions', TRANSACTION_HEADERS);
  await ensureHeader(sheets, config.GOOGLE_SHEET_ID, 'Settings', SETTINGS_HEADERS);
  const categoriesInit = await ensureHeader(sheets, config.GOOGLE_SHEET_ID, 'Categories', CATEGORIES_HEADERS);

  // Populate default categories if newly created
  if (categoriesInit) {
    const categoryRows = DEFAULT_CATEGORIES.map((cat, idx) => [
      `CAT-${String(idx + 1).padStart(3, '0')}`,
      cat,
      'TRUE',
      new Date().toISOString(),
    ]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: 'Categories!A2:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: categoryRows },
    });
    console.log('[Sheets] Seeded default categories.');
  }
}

async function ensureHeader(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  headers: string[]
): Promise<boolean> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:Z1`,
  });

  if (!res.data.values || res.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [headers] },
    });
    return true;
  }
  return false;
}

