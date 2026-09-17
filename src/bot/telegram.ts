import { Bot } from 'grammy';
import { getConfig } from '../config/config.js';
import { authMiddleware } from './auth.js';
import {
  handleStartCommand,
  handleHelpCommand,
  handleTodaySummaryCommand,
  handleMonthSummaryCommand,
  handleBalanceCommand,
  handleSetBalanceCommand,
  handleDeleteCommand,
  handleExportCommand,
  handleLimitsCommand,
  handleBudgetCommand,
  handleSetBudgetCommand,
  handleModeCommand,
  handleChartCommand,
  handleTextMessage,
  handlePhotoMessage,
  handleVoiceMessage,
  handleCallbackQuery,
} from './handlers.js';

export function createBot(): Bot {
  const config = getConfig();
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  // Error boundary
  bot.catch((err) => {
    console.error('[Bot Uncaught Error]', err);
  });

  // Authentication middleware
  bot.use(authMiddleware);

  // Command handlers
  bot.command('start', handleStartCommand);
  bot.command('help', handleHelpCommand);
  bot.command('today', handleTodaySummaryCommand);
  bot.command('summary', handleTodaySummaryCommand);
  bot.command('month', handleMonthSummaryCommand);
  bot.command('balance', handleBalanceCommand);
  bot.command('setbalance', handleSetBalanceCommand);
  bot.command('budget', handleBudgetCommand);
  bot.command('setbudget', handleSetBudgetCommand);
  bot.command('mode', handleModeCommand);
  bot.command('chart', handleChartCommand);
  bot.command('limits', handleLimitsCommand);
  bot.command('status', handleLimitsCommand);
  bot.command('delete', handleDeleteCommand);
  bot.command('export', handleExportCommand);

  // Message listeners
  bot.on('message:voice', handleVoiceMessage);
  bot.on('message:photo', handlePhotoMessage);
  bot.on('message:text', handleTextMessage);

  // Callback query listener (Inline buttons)
  bot.on('callback_query:data', handleCallbackQuery);

  return bot;
}

export async function registerBotCommands(bot: Bot): Promise<void> {
  try {
    await bot.api.setMyCommands([
      { command: 'today', description: '📊 สรุปรายรับ-รายจ่ายวันนี้' },
      { command: 'month', description: '📅 สรุปยอดประจำเดือนนี้' },
      { command: 'chart', description: '📈 ดูกราฟสรุปค่าใช้จ่ายภาพสี' },
      { command: 'balance', description: '💳 เช็คยอดเงินคงเหลือสุทธิ' },
      { command: 'budget', description: '🎯 เช็คสถานะงบประมาณรายเดือน' },
      { command: 'setbudget', description: '💵 กำหนดยอดงบประมาณ' },
      { command: 'mode', description: '⚡ สลับโหมด Auto-Save / Confirm' },
      { command: 'limits', description: '⚡ เช็คโควต้าและสถานะบริการ' },
      { command: 'setbalance', description: '💰 ตั้งค่ายอดเงินเริ่มต้น' },
      { command: 'delete', description: '🗑️ ขอลบรายการล่าสุด' },
      { command: 'export', description: '📁 ส่งออกข้อมูลเป็นไฟล์ CSV' },
      { command: 'help', description: '📖 ดูคู่มือการใช้งานบอท' },
    ]);
    console.log('[Bot] Telegram command menu registered successfully.');
  } catch (err) {
    console.warn('[Bot Warning] Could not register Telegram command menu:', err);
  }
}
