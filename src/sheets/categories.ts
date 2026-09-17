import { getGoogleSheetsClient, DEFAULT_CATEGORIES } from './client.js';
import { getConfig } from '../config/config.js';

let cachedCategories: string[] = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 60 * 1000; // Cache for 1 minute

export async function getActiveCategories(): Promise<string[]> {
  const now = Date.now();
  if (cachedCategories.length > 0 && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedCategories;
  }

  try {
    const config = getConfig();
    const sheets = await getGoogleSheetsClient();

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: 'Categories!A2:C',
    });

    const rows = res.data.values || [];
    const active = rows
      .filter((r) => r[1] && (r[2] === 'TRUE' || r[2] === undefined))
      .map((r) => (r[1] as string).trim());

    if (active.length > 0) {
      cachedCategories = active;
      lastFetchedAt = now;
      return cachedCategories;
    }
  } catch (error) {
    console.warn('[Categories] Failed to fetch categories from sheet, falling back to defaults.', error);
  }

  return DEFAULT_CATEGORIES;
}

