import { getGoogleSheetsClient, SETTINGS_HEADERS } from './client.js';
import { getConfig } from '../config/config.js';
import { UserSettings } from '../transactions/types.js';

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Settings!A2:K',
  });

  const rows = res.data.values || [];
  const userRow = rows.find((r) => r[0] === userId);

  if (userRow) {
    const hasBudgetCol = userRow.length >= 11 || (userRow[2] !== undefined && !isNaN(parseFloat(userRow[2])));
    const monthlyBudget = hasBudgetCol ? parseFloat(userRow[2]) || 0 : 0;
    const defaultAccount = hasBudgetCol ? userRow[3] || config.DEFAULT_ACCOUNT : userRow[2] || config.DEFAULT_ACCOUNT;
    const reminderEnabled = (hasBudgetCol ? userRow[4] : userRow[3]) === 'TRUE';
    const reminderTime = (hasBudgetCol ? userRow[5] : userRow[4]) || config.REMINDER_TIME;
    const secondReminderTime = (hasBudgetCol ? userRow[6] : userRow[5]) || config.SECOND_REMINDER_TIME;
    const timezone = (hasBudgetCol ? userRow[7] : userRow[6]) || config.TIMEZONE;
    const slipMode = ((hasBudgetCol ? userRow[8] : userRow[7]) === 'auto_save') ? 'auto_save' : 'confirm';
    const createdAt = (hasBudgetCol ? userRow[9] : userRow[8]) || new Date().toISOString();
    const updatedAt = (hasBudgetCol ? userRow[10] : userRow[9]) || new Date().toISOString();

    return {
      telegramUserId: userRow[0],
      startingBalance: parseFloat(userRow[1]) || 0,
      monthlyBudget,
      defaultAccount,
      reminderEnabled,
      reminderTime,
      secondReminderTime,
      timezone,
      slipMode,
      createdAt,
      updatedAt,
    };
  }

  // Default initial settings
  const defaultSettings: UserSettings = {
    telegramUserId: userId,
    startingBalance: 0,
    monthlyBudget: 0,
    defaultAccount: config.DEFAULT_ACCOUNT,
    reminderEnabled: true,
    reminderTime: config.REMINDER_TIME,
    secondReminderTime: config.SECOND_REMINDER_TIME,
    timezone: config.TIMEZONE,
    slipMode: 'confirm',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save new user row to Settings
  await updateUserSettings(defaultSettings);
  return defaultSettings;
}

export async function updateUserSettings(settings: UserSettings): Promise<void> {
  const config = getConfig();
  const sheets = await getGoogleSheetsClient();

  // Ensure header is updated to A1:K1
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Settings!A1:K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [SETTINGS_HEADERS] },
  });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.GOOGLE_SHEET_ID,
    range: 'Settings!A2:A',
  });

  const rows = res.data.values || [];
  const rowIndex = rows.findIndex((r) => r[0] === settings.telegramUserId);

  const rowValues = [
    settings.telegramUserId,
    settings.startingBalance,
    settings.monthlyBudget,
    settings.defaultAccount,
    settings.reminderEnabled ? 'TRUE' : 'FALSE',
    settings.reminderTime,
    settings.secondReminderTime,
    settings.timezone,
    settings.slipMode,
    settings.createdAt,
    new Date().toISOString(),
  ];

  if (rowIndex >= 0) {
    const actualRow = rowIndex + 2;
    await sheets.spreadsheets.values.update({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: `Settings!A${actualRow}:K${actualRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowValues] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: config.GOOGLE_SHEET_ID,
      range: 'Settings!A:K',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowValues] },
    });
  }
}
