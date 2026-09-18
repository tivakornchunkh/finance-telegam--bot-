import { Context, InputFile } from 'grammy';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { parseTransactionText } from '../ai/parser.js';
import { parseSlipImage } from '../ai/vision.js';
import { parseVoiceMessage } from '../ai/voice.js';
import { askFinancialAdvisor, FinancialContext } from '../ai/advisor.js';
import { generateCategoryPieChart, generateDailyBarChart } from '../summary/charts.js';
import { validateTransactionData } from '../transactions/validator.js';
import { checkDuplicateTransaction } from '../transactions/duplicate.js';
import {
  appendTransaction,
  getAllTransactions,
  deleteTransactionById,
  getLatestTransactionByUser,
} from '../sheets/transactions.js';
import { getUserSettings, updateUserSettings } from '../sheets/settings.js';
import { getActiveCategories } from '../sheets/categories.js';
import { calculateBalance } from '../summary/balance.js';
import { calculateDailySummary } from '../summary/daily.js';
import { calculateMonthlySummary } from '../summary/monthly.js';
import {
  createConfirmationKeyboard,
  createDuplicateWarningKeyboard,
  createDeleteConfirmationKeyboard,
} from './keyboards.js';
import { Transaction, UserSettings } from '../transactions/types.js';
import { getAiUsageStats } from '../ai/tracker.js';
import { uploadSlipImage } from '../utils/uploader.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Bangkok';

export interface PendingDraft {
  id: string;
  transaction: Omit<Transaction, 'id' | 'createdAt'>;
  createdAt: number;
}

// In-memory store for confirmation drafts (15 min TTL)
const pendingDrafts = new Map<string, PendingDraft>();
const processedDrafts = new Map<string, string>();

function getBangkokNow(): dayjs.Dayjs {
  return dayjs().tz(TIMEZONE);
}

export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();
  const balanceInfo = calculateBalance(settings.startingBalance, transactions);
  const monthStr = getBangkokNow().format('YYYY-MM');
  const monthly = calculateMonthlySummary(monthStr, transactions, settings.startingBalance);

  const budgetUsedPercent =
    settings.monthlyBudget > 0
      ? Math.round((monthly.totalExpense / settings.monthlyBudget) * 100)
      : null;

  const topCategories = Object.entries(monthly.categories)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  const recentTransactions = transactions.slice(-5).map((t) => ({
    date: t.date,
    description: t.description,
    amount: t.amount,
    type: t.type,
  }));

  return {
    currentBalance: balanceInfo.currentBalance,
    monthlyIncome: monthly.totalIncome,
    monthlyExpense: monthly.totalExpense,
    netSavings: monthly.net,
    monthlyBudget: settings.monthlyBudget,
    budgetUsedPercent,
    topCategories,
    recentTransactions,
  };
}

export function checkBudgetAlert(settings: UserSettings, currentMonthlyExpense: number): string | null {
  if (settings.monthlyBudget <= 0) return null;
  const percent = Math.round((currentMonthlyExpense / settings.monthlyBudget) * 100);
  if (percent >= 100) {
    return `🚨 **คำเตือน: คุณใช้จ่ายทะลุงบประมาณเดือนนี้แล้ว!** (${currentMonthlyExpense.toLocaleString('th-TH')} / ${settings.monthlyBudget.toLocaleString('th-TH')} บาท - ${percent}%)`;
  }
  if (percent >= 80) {
    return `⚠️ **แจ้งเตือน: คุณใช้จ่ายแตะ ${percent}% ของงบประมาณเดือนนี้แล้วครับ** (${currentMonthlyExpense.toLocaleString('th-TH')} / ${settings.monthlyBudget.toLocaleString('th-TH')} บาท)`;
  }
  return null;
}

export async function handleStartCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);

  let message = `👋 **สวัสดีครับ ยินดีต้อนรับสู่ระบบ Personal Finance Assistant!**\n\n`;
  message += `บอทนี้จะช่วยให้คุณบันทึกรายรับ-รายจ่ายผ่าน Telegram ได้สะดวกที่สุด โดยข้อมูลทั้งหมดจะถูกบันทึกลง **Google Sheets** ของคุณโดยตรงครับ\n\n`;

  if (settings.startingBalance === 0) {
    message += `⚠️ **ขั้นตอนแรก:** ยังไม่ได้กำหนดยอดเงินเริ่มต้น\n`;
    message += `คุณสามารถพิมพ์คำสั่ง เช่น: \`/setbalance 5000\` เพื่อตั้งค่ายอดเงินเริ่มต้นได้เลยครับ\n\n`;
  } else {
    message += `💰 ยอดเงินเริ่มต้นปัจจุบัน: **${settings.startingBalance.toLocaleString('th-TH')} บาท**\n\n`;
  }

  message += `💡 **วิธีใช้งานง่ายๆ:**\n`;
  message += `• พิมพ์ข้อความธรรมดา เช่น: \`จ่าย 55 ข้าว\` หรือ \`ได้รับ 500 จากแม่\`\n`;
  message += `• ส่งรูปสลิปโอนเงิน (พร้อมพิมพ์ข้อความเพิ่มเติมได้)\n`;
  message += `• พิมพ์ \`/today\` เพื่อดูสรุปประจำวัน\n`;
  message += `• พิมพ์ \`/month\` เพื่อดูสรุปประจำเดือน\n`;
  message += `• พิมพ์ \`/balance\` เพื่อดูยอดคงเหลือล่าสุด\n`;
  message += `• พิมพ์ \`/export\` เพื่อดาวน์โหลดไฟล์ CSV\n`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleHelpCommand(ctx: Context): Promise<void> {
  let message = `📖 **คู่มือการใช้งานบอท:**\n\n`;
  message += `1. **บันทึกรายการ:**\n`;
  message += `   - \`จ่าย 55 ข้าว\` (รายจ่าย)\n`;
  message += `   - \`ซื้อกาแฟ 75\` (รายจ่าย)\n`;
  message += `   - \`ได้รับ 500 จากแม่\` (รายรับ)\n`;
  message += `   - หรือส่งรูปสลิปได้โดยตรง 📷\n\n`;
  message += `2. **คำสั่งสรุปยอด:**\n`;
  message += `   - \`/today\` หรือพิมพ์ "สรุปวันนี้"\n`;
  message += `   - \`/month\` หรือพิมพ์ "สรุปเดือนนี้"\n`;
  message += `   - \`/balance\` หรือพิมพ์ "ยอดเงินเหลือเท่าไหร่"\n\n`;
  message += `3. **การจัดการ:**\n`;
  message += `   - \`/delete\` ลบรายการล่าสุดที่เพิ่งบันทึก\n`;
  message += `   - \`/setbalance <จำนวนเงิน>\` กำหนดยอดเงินเริ่มต้น\n`;
  message += `   - \`/export\` ส่งออกข้อมูลเป็นไฟล์ CSV\n`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleBalanceCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();

  const balance = calculateBalance(settings.startingBalance, transactions);

  let message = `💳 **ยอดเงินคงเหลือปัจจุบัน**\n\n`;
  message += `💰 ยอดเริ่มต้น: ${balance.startingBalance.toLocaleString('th-TH')} บาท\n`;
  message += `📈 รายรับทั้งหมด: +${balance.totalIncome.toLocaleString('th-TH')} บาท\n`;
  message += `📉 รายจ่ายทั้งหมด: -${balance.totalExpense.toLocaleString('th-TH')} บาท\n`;
  message += `──────────────────\n`;
  message += `💵 **ยอดคงเหลือสุทธิ: ${balance.currentBalance.toLocaleString('th-TH')} บาท**\n`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleTodaySummaryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();

  const todayStr = getBangkokNow().format('YYYY-MM-DD');
  const summary = calculateDailySummary(todayStr, transactions, settings.startingBalance);

  let message = `📊 **สรุปวันนี้ (${dayjs(todayStr).format('DD/MM/YYYY')})**\n\n`;
  message += `💰 รายรับ: ${summary.totalIncome.toLocaleString('th-TH')} บาท\n`;
  message += `💸 รายจ่าย: ${summary.totalExpense.toLocaleString('th-TH')} บาท\n`;
  const netSign = summary.net >= 0 ? '+' : '';
  message += `📈 สุทธิ: ${netSign}${summary.net.toLocaleString('th-TH')} บาท\n\n`;

  const catEntries = Object.entries(summary.categories);
  if (catEntries.length > 0) {
    message += `📋 **แยกตามหมวดหมู่:**\n`;
    for (const [cat, amt] of catEntries) {
      message += `• ${cat}: ${amt.toLocaleString('th-TH')} บาท\n`;
    }
    message += `\n`;
  }

  message += `💳 ยอดคงเหลือ: **${summary.currentBalance.toLocaleString('th-TH')} บาท**\n`;
  message += `📝 บันทึกไปทั้งหมด: ${summary.transactionCount} รายการ`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleMonthSummaryCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();

  const monthStr = getBangkokNow().format('YYYY-MM');
  const summary = calculateMonthlySummary(monthStr, transactions, settings.startingBalance);

  let message = `📅 **สรุปเดือนนี้ (${monthStr})**\n\n`;
  message += `💰 รายรับรวม: ${summary.totalIncome.toLocaleString('th-TH')} บาท\n`;
  message += `💸 รายจ่ายรวม: ${summary.totalExpense.toLocaleString('th-TH')} บาท\n`;
  const netSign = summary.net >= 0 ? '+' : '';
  message += `📈 สุทธิ: ${netSign}${summary.net.toLocaleString('th-TH')} บาท\n`;
  message += `💳 ยอดคงเหลือล่าสุด: **${summary.currentBalance.toLocaleString('th-TH')} บาท**\n\n`;

  const catEntries = Object.entries(summary.categories).sort((a, b) => b[1] - a[1]);
  if (catEntries.length > 0) {
    message += `🏷️ **หมวดหมู่ที่ใช้จ่ายสูงสุด:**\n`;
    for (const [cat, amt] of catEntries) {
      message += `• ${cat}: ${amt.toLocaleString('th-TH')} บาท\n`;
    }
    message += `\n`;
  }

  message += `📊 ค่าเฉลี่ยรายจ่ายต่อวัน: ${summary.dailyAverageExpense.toLocaleString('th-TH')} บาท\n`;
  if (summary.maxExpenseDay) {
    message += `🔥 วันที่ใช้เงินมากที่สุด: ${dayjs(summary.maxExpenseDay.date).format('DD/MM/YYYY')} (${summary.maxExpenseDay.amount.toLocaleString('th-TH')} บาท)\n`;
  }
  message += `🔢 จำนวนรายการ: ${summary.transactionCount} รายการ`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleSetBalanceCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text || '';
  const parts = text.split(' ');
  if (parts.length < 2 || isNaN(parseFloat(parts[1]))) {
    await ctx.reply('⚠️ กรุณาระบุจำนวนเงิน เช่น: `/setbalance 5000`', { parse_mode: 'Markdown' });
    return;
  }

  const amount = parseFloat(parts[1]);
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);

  settings.startingBalance = amount;
  await updateUserSettings(settings);

  await ctx.reply(`✅ ตั้งค่ายอดเงินเริ่มต้นเป็น **${amount.toLocaleString('th-TH')} บาท** เรียบร้อยครับ!`, {
    parse_mode: 'Markdown',
  });
}

export async function handleDeleteCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const latestTxn = await getLatestTransactionByUser(userId);

  if (!latestTxn) {
    await ctx.reply('⚠️ ยังไม่พบรายการที่สามารถลบได้ครับ');
    return;
  }

  const emoji = latestTxn.type === 'income' ? '💰 รายรับ' : '💸 รายจ่าย';
  let card = `⚠️ **ต้องการลบรายการล่าสุดนี้หรือไม่?**\n\n`;
  card += `${emoji}: ${latestTxn.amount.toLocaleString('th-TH')} บาท\n`;
  card += `🍚 หมวดหมู่: ${latestTxn.category}\n`;
  card += `📝 รายละเอียด: ${latestTxn.description}\n`;
  card += `📅 วันที่: ${latestTxn.date} ${latestTxn.time}\n`;

  await ctx.reply(card, {
    parse_mode: 'Markdown',
    reply_markup: createDeleteConfirmationKeyboard(latestTxn.id),
  });
}

export async function handleExportCommand(ctx: Context): Promise<void> {
  const transactions = await getAllTransactions();

  if (transactions.length === 0) {
    await ctx.reply('⚠️ ยังไม่มีข้อมูลรายการสำหรับส่งออกครับ');
    return;
  }

  const headers = [
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
    'CreatedAt',
  ];

  const csvRows = [headers.join(',')];
  for (const t of transactions) {
    const row = [
      t.id,
      t.date,
      t.time,
      t.type,
      t.amount,
      `"${(t.category || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.account,
      t.source,
      `"${(t.merchant || '').replace(/"/g, '""')}"`,
      t.reference || '',
      t.telegramMessageId,
      t.createdBy,
      t.createdAt,
    ];
    csvRows.push(row.join(','));
  }

  const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM for Excel compatibility
  const buffer = Buffer.from(csvContent, 'utf-8');

  await ctx.replyWithDocument(new InputFile(buffer, `transactions_${getBangkokNow().format('YYYYMMDD')}.csv`), {
    caption: `📁 ส่งออกข้อมูลรายการทั้งหมด (${transactions.length} รายการ) เรียบร้อยครับ`,
  });
}

export async function handleLimitsCommand(ctx: Context): Promise<void> {
  const stats = getAiUsageStats();
  const transactions = await getAllTransactions();
  const todayStr = getBangkokNow().format('YYYY-MM-DD');
  const todayTxns = transactions.filter((t) => t.date === todayStr);

  const percentUsed = Math.min(100, Math.round((stats.dailyRequests / stats.dailyLimit) * 100));

  let message = `📊 **สถานะระบบและโควต้าบริการ (Service Limits & Status)**\n\n`;

  message += `🤖 **Google Gemini AI (สมองอ่านข้อความและสลิป)**\n`;
  message += `• โมเดล: \`gemini-3.6-flash\` (Google AI Studio)\n`;
  message += `• ใช้งานวันนี้: **${stats.dailyRequests} / ${stats.dailyLimit.toLocaleString('th-TH')} ครั้ง** (${percentUsed}%)\n`;
  message += `• โควต้าคงเหลือวันนี้: **${stats.remainingDaily.toLocaleString('th-TH')} ครั้ง** (รีเซ็ตทุกเที่ยงคืน)\n`;
  message += `• ขีดจำกัดความเร็ว: **${stats.rpmLimit} ครั้ง/นาที (RPM)**\n`;
  if (stats.lastRequestTime) {
    message += `• เรียกใช้งานล่าสุด: \`${stats.lastRequestTime}\`\n`;
  }
  message += `\n`;

  message += `📑 **Google Sheets (ฐานข้อมูล)**\n`;
  message += `• สถานะ: 🟢 **เชื่อมต่อสำเร็จ (Online)**\n`;
  message += `• บันทึกวันนี้: **${todayTxns.length} รายการ**\n`;
  message += `• บันทึกสะสมทั้งหมด: **${transactions.length} รายการ**\n`;
  message += `• โควต้า Sheets API: **300 ครั้ง/นาที** (ไม่จำกัดจำนวนครั้งต่อวัน)\n\n`;

  const botTag = ctx.me?.username ? `\`@${ctx.me.username}\`` : 'Bot';
  message += `⏱️ **สถานะเซิร์ฟเวอร์บอท (${botTag})**\n`;
  message += `• สถานะ: 🟢 **กำลังรับข้อความ (Polling Active)**\n`;
  message += `• เวลาปัจจุบัน: \`${getBangkokNow().format('YYYY-MM-DD HH:mm:ss')} (UTC+7)\`\n`;
  message += `• เวลาแจ้งเตือนรายวัน: \`20:00\` และ \`22:00\` น.\n`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

export async function handleBudgetCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();
  const monthStr = getBangkokNow().format('YYYY-MM');
  const monthly = calculateMonthlySummary(monthStr, transactions, settings.startingBalance);

  if (settings.monthlyBudget <= 0) {
    let msg = `🎯 **ระบบงบประมาณรายเดือน (Monthly Budget)**\n\n`;
    msg += `ปัจจุบันคุณยังไม่ได้ตั้งงบประมาณรายเดือนครับ\n\n`;
    msg += `💡 สามารถพิมพ์คำสั่ง เช่น: \`/setbudget 15000\` เพื่อกำหนดเพดานงบประมาณของเดือนนี้ได้เลยครับ`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
    return;
  }

  const budget = settings.monthlyBudget;
  const spent = monthly.totalExpense;
  const remaining = budget - spent;
  const percent = Math.round((spent / budget) * 100);

  // Visual progress bar (10 blocks)
  const filledBlocks = Math.min(10, Math.max(0, Math.round(percent / 10)));
  const emptyBlocks = 10 - filledBlocks;
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(emptyBlocks);

  let statusEmoji = '🟢';
  let statusText = 'อยู่ในเกณฑ์ปกติ';
  if (percent >= 100) {
    statusEmoji = '🚨';
    statusText = 'ใช้จ่ายเกินงบประมาณแล้ว!';
  } else if (percent >= 80) {
    statusEmoji = '🟡';
    statusText = 'ใกล้แตะเพดานงบแล้ว ระวังการใช้จ่าย';
  }

  let card = `🎯 **สถานะงบประมาณประจำเดือน (${monthStr})**\n\n`;
  card += `💵 งบประมาณที่ตั้งไว้: **${budget.toLocaleString('th-TH')} บาท**\n`;
  card += `💸 ใช้ไปแล้ว: **${spent.toLocaleString('th-TH')} บาท**\n`;
  card += `${remaining >= 0 ? '💰 คงเหลือใช้ได้อีก' : '⚠️ ใช้เกินงบไปแล้ว'}: **${Math.abs(remaining).toLocaleString('th-TH')} บาท**\n\n`;
  card += `📊 ความคืบหน้า: **${percent}%**\n`;
  card += `\`[${progressBar}]\`\n\n`;
  card += `${statusEmoji} สถานะ: **${statusText}**\n\n`;
  card += `💡 เปลี่ยนงบใหม่ได้ตลอดเวลาด้วยคำสั่ง: \`/setbudget <จำนวนเงิน>\``;

  await ctx.reply(card, { parse_mode: 'Markdown' });
}

export async function handleSetBudgetCommand(ctx: Context): Promise<void> {
  const text = ctx.message?.text || '';
  const parts = text.split(' ');
  if (parts.length < 2 || isNaN(parseFloat(parts[1]))) {
    await ctx.reply('⚠️ กรุณาระบุจำนวนเงิน เช่น: `/setbudget 15000`', { parse_mode: 'Markdown' });
    return;
  }

  const amount = Math.abs(parseFloat(parts[1]));
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);

  settings.monthlyBudget = amount;
  await updateUserSettings(settings);

  await ctx.reply(`🎯 ตั้งค่างบประมาณรายเดือนเป็น **${amount.toLocaleString('th-TH')} บาท** เรียบร้อยครับ!`, {
    parse_mode: 'Markdown',
  });
}

export async function handleModeCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);

  const newMode = settings.slipMode === 'auto_save' ? 'confirm' : 'auto_save';
  settings.slipMode = newMode;
  await updateUserSettings(settings);

  if (newMode === 'auto_save') {
    let msg = `⚡ **เปิดใช้งานโหมด Auto-Save เรียบร้อย!**\n\n`;
    msg += `ต่อไปนี้เมื่อคุณส่งสลิปหรือพิมพ์ข้อความ บอทจะบันทึกลง Google Sheet ทันทีโดยไม่ต้องกดปุ่มยืนยันครับ 🚀\n\n`;
    msg += `(พิมพ์ \`/mode\` อีกครั้งเมื่อต้องการกลับไปใช้โหมดเดิม)`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  } else {
    let msg = `🛡️ **เปิดใช้งานโหมด Confirm เรียบร้อย!**\n\n`;
    msg += `บอทจะแสดงตัวอย่างรายการและปุ่ม \`[✅ ยืนยัน]\` ให้คุณตรวจสอบก่อนบันทึกทุกครั้งครับ 🔒\n\n`;
    msg += `(พิมพ์ \`/mode\` อีกครั้งเมื่อต้องการเปิด Auto-Save)`;
    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }
}

export async function handleChartCommand(ctx: Context): Promise<void> {
  const userId = ctx.from?.id.toString() || '';
  const settings = await getUserSettings(userId);
  const transactions = await getAllTransactions();
  const monthStr = getBangkokNow().format('YYYY-MM');
  const monthly = calculateMonthlySummary(monthStr, transactions, settings.startingBalance);

  if (monthly.totalExpense === 0 || Object.keys(monthly.categories).length === 0) {
    await ctx.reply('⚠️ ยังไม่มีข้อมูลรายจ่ายในเดือนนี้สำหรับสร้างกราฟครับ');
    return;
  }

  const waitMsg = await ctx.reply('📈 กำลังวาดกราฟสรุปรายจ่าย...');
  const chartBuffer = await generateCategoryPieChart(
    monthly.categories,
    `สัดส่วนรายจ่ายประจำเดือน ${monthStr} (${monthly.totalExpense.toLocaleString('th-TH')} บ.)`
  );

  await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});

  if (!chartBuffer) {
    await ctx.reply('⚠️ ไม่สามารถสร้างรูปภาพกราฟได้ชั่วคราว กรุณาลองใหม่อีกครั้งครับ');
    return;
  }

  let caption = `📊 **สัดส่วนรายจ่ายประจำเดือน (${monthStr})**\n`;
  caption += `💸 รายจ่ายรวม: **${monthly.totalExpense.toLocaleString('th-TH')} บาท**\n\n`;
  const entries = Object.entries(monthly.categories).sort((a, b) => b[1] - a[1]);
  for (const [cat, amt] of entries) {
    const pct = Math.round((amt / monthly.totalExpense) * 100);
    caption += `• ${cat}: ${amt.toLocaleString('th-TH')} บ. (${pct}%)\n`;
  }

  await ctx.replyWithPhoto(new InputFile(chartBuffer, `chart_${monthStr}.png`), {
    caption,
    parse_mode: 'Markdown',
  });
}

export async function handleTextMessage(ctx: Context): Promise<void> {
  const text = ctx.message?.text?.trim() || '';
  if (!text || text.startsWith('/')) return;

  // Check conversational summary phrases
  if (text.includes('สรุปวันนี้') || text.includes('วันนี้ใช้ไปเท่าไหร่')) {
    return handleTodaySummaryCommand(ctx);
  }
  if (text.includes('สรุปเดือนนี้')) {
    return handleMonthSummaryCommand(ctx);
  }
  if (text.includes('ยอดเงินเหลือเท่าไหร่') || text.includes('ตอนนี้มีเงินเท่าไหร่') || text.includes('ยอดคงเหลือ')) {
    return handleBalanceCommand(ctx);
  }
  if (text.includes('ลบรายการ')) {
    return handleDeleteCommand(ctx);
  }
  if (text.includes('ลิมิต') || text.includes('เช็คสถานะ') || text.toLowerCase().includes('status') || text.toLowerCase().includes('limit')) {
    return handleLimitsCommand(ctx);
  }

  const userId = ctx.from?.id.toString() || '';
  const now = getBangkokNow();
  const todayStr = now.format('YYYY-MM-DD');
  const timeStr = now.format('HH:mm:ss');

  const categories = await getActiveCategories();
  const settings = await getUserSettings(userId);

  // Send temporary processing indicator
  const waitMsg = await ctx.reply('⏳ กำลังประมวลผลข้อความ...');

  try {
    const parsed = await parseTransactionText(text, categories, todayStr);

    if (parsed.intent === 'clarification_needed' || !parsed.amount) {
      await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);

      // Check if message is a question or conversation -> route to AI Advisor!
      const isConversational =
        !/(\d+)/.test(text) ||
        text.includes('?') ||
        text.includes('ไหม') ||
        text.includes('มั้ย') ||
        text.includes('ช่วย') ||
        text.includes('แนะนำ') ||
        text.includes('ทำไม') ||
        text.includes('เปลือง') ||
        text.includes('กินอะไร') ||
        text.includes('เงิน') ||
        text.includes('สวัสดี');

      if (isConversational) {
        const financialCtx = await buildFinancialContext(userId);
        const advice = await askFinancialAdvisor(text, financialCtx);
        await ctx.reply(advice);
        return;
      }

      await ctx.reply(parsed.clarificationQuestion || 'วันนี้มีรายการกี่บาท และเป็นค่าอะไรครับ?');
      return;
    }

    const validation = validateTransactionData(parsed, {
      telegramMessageId: ctx.message!.message_id,
      createdBy: userId,
      source: 'text',
      defaultAccount: settings.defaultAccount,
      todayDateStr: todayStr,
      currentTimeStr: timeStr,
    });

    if (!validation.isValid || !validation.transaction) {
      await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);
      await ctx.reply(`⚠️ ${validation.error}`);
      return;
    }

    // Check duplicate
    const existing = await getAllTransactions();
    const dupCheck = checkDuplicateTransaction(validation.transaction, existing);

    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);

    const txn = validation.transaction;
    const typeLabel = txn.type === 'expense' ? '💸 รายจ่าย' : '💰 รายรับ';

    // Auto-Save Mode Support
    if (settings.slipMode === 'auto_save' && !dupCheck.isDuplicate) {
      const savedTxn = await appendTransaction(txn);
      const allTxns = await getAllTransactions();
      const balance = calculateBalance(settings.startingBalance, allTxns);
      const monthStr = now.format('YYYY-MM');
      const monthly = calculateMonthlySummary(monthStr, allTxns, settings.startingBalance);
      const budgetAlert = checkBudgetAlert(settings, monthly.totalExpense);

      let msg = `⚡ **[Auto-Save] บันทึกข้อมูลเรียบร้อย!**\n\n`;
      msg += `${typeLabel}: **${savedTxn.amount.toLocaleString('th-TH')} บาท**\n`;
      msg += `🍜 หมวดหมู่: ${savedTxn.category}\n`;
      msg += `📝 รายละเอียด: ${savedTxn.description}\n`;
      msg += `💳 **ยอดคงเหลือ: ${balance.currentBalance.toLocaleString('th-TH')} บาท**\n`;
      if (budgetAlert) msg += `\n${budgetAlert}`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
      return;
    }

    const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    pendingDrafts.set(draftId, {
      id: draftId,
      transaction: validation.transaction,
      createdAt: Date.now(),
    });

    if (dupCheck.isDuplicate) {
      let warn = `⚠️ **${dupCheck.reason}**\n\n`;
      warn += `${typeLabel}: **${txn.amount.toLocaleString('th-TH')} บาท**\n`;
      warn += `🍜 หมวดหมู่: ${txn.category}\n`;
      warn += `📝 รายละเอียด: ${txn.description}\n`;
      warn += `📅 วันที่: ${dayjs(txn.date).format('DD/MM/YYYY')}\n\n`;
      warn += `ต้องการบันทึกอีกครั้งไหม?`;
      await ctx.reply(warn, {
        parse_mode: 'Markdown',
        reply_markup: createDuplicateWarningKeyboard(draftId),
      });
      return;
    }

    let card = `✅ **ตรวจพบรายการ**\n\n`;
    card += `${typeLabel}: **${txn.amount.toLocaleString('th-TH')} บาท**\n`;
    card += `🍜 หมวดหมู่: ${txn.category}\n`;
    card += `📝 รายละเอียด: ${txn.description}\n`;
    card += `💳 บัญชี: ${txn.account}\n`;
    card += `📅 วันที่: ${dayjs(txn.date).format('DD/MM/YYYY')}\n\n`;
    card += `ต้องการบันทึกไหม?`;

    await ctx.reply(card, {
      parse_mode: 'Markdown',
      reply_markup: createConfirmationKeyboard(draftId),
    });
  } catch (error) {
    console.error('[Handler Error]', error);
    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);
    await ctx.reply('⚠️ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้งครับ');
  }
}

export async function handlePhotoMessage(ctx: Context): Promise<void> {
  const photoArray = ctx.message?.photo;
  if (!photoArray || photoArray.length === 0) return;

  // Pick largest resolution
  const photo = photoArray[photoArray.length - 1];
  const caption = ctx.message?.caption?.trim() || null;
  const userId = ctx.from?.id.toString() || '';

  const now = getBangkokNow();
  const todayStr = now.format('YYYY-MM-DD');
  const timeStr = now.format('HH:mm:ss');

  const waitMsg = await ctx.reply('🧾 กำลังดาวน์โหลดและอ่านข้อมูลสลิปด้วย AI Vision...');

  try {
    const file = await ctx.api.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);

    const [categories, settings, slipImageUrl] = await Promise.all([
      getActiveCategories(),
      getUserSettings(userId),
      uploadSlipImage(imageBuffer, `slip_${Date.now()}.jpg`, 'image/jpeg').catch((err) => {
        console.warn('[Slip Upload] Upload failed:', err);
        return null;
      }),
    ]);

    const parsed = await parseSlipImage(imageBuffer, 'image/jpeg', caption, categories, todayStr);

    if (parsed.intent === 'clarification_needed' || !parsed.amount) {
      await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);
      await ctx.reply(
        parsed.clarificationQuestion ||
          '⚠️ อ่านสลิปไม่ครบ ผมยังอ่านจำนวนเงินได้ไม่ชัดเจน กรุณาส่งรูปที่ชัดขึ้น หรือพิมพ์จำนวนเงินให้ผมครับ'
      );
      return;
    }

    const validation = validateTransactionData(parsed, {
      telegramMessageId: ctx.message!.message_id,
      createdBy: userId,
      source: 'receipt',
      defaultAccount: settings.defaultAccount,
      todayDateStr: todayStr,
      currentTimeStr: timeStr,
    });

    if (!validation.isValid || !validation.transaction) {
      await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);
      await ctx.reply(`⚠️ ${validation.error}`);
      return;
    }

    validation.transaction.receiptReference = photo.file_id;
    if (slipImageUrl) {
      validation.transaction.slipImageUrl = slipImageUrl;
    }

    // Check duplicate
    const existing = await getAllTransactions();
    const dupCheck = checkDuplicateTransaction(validation.transaction, existing);

    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id);

    const txn = validation.transaction;
    const typeLabel = txn.type === 'expense' ? '💸 รายจ่าย' : '💰 รายรับ';

    // Auto-Save Mode Support for Slip
    if (settings.slipMode === 'auto_save' && !dupCheck.isDuplicate) {
      const savedTxn = await appendTransaction(txn);
      const allTxns = await getAllTransactions();
      const balance = calculateBalance(settings.startingBalance, allTxns);
      const monthStr = now.format('YYYY-MM');
      const monthly = calculateMonthlySummary(monthStr, allTxns, settings.startingBalance);
      const budgetAlert = checkBudgetAlert(settings, monthly.totalExpense);

      let msg = `⚡ **[Auto-Save] บันทึกสลิปเรียบร้อย!**\n\n`;
      msg += `${typeLabel}: **${savedTxn.amount.toLocaleString('th-TH')} บาท**\n`;
      if (savedTxn.merchant) msg += `🏪 ผู้รับ/ร้านค้า: ${savedTxn.merchant}\n`;
      msg += `🍜 หมวดหมู่: ${savedTxn.category}\n`;
      msg += `📝 รายละเอียด: ${savedTxn.description}\n`;
      if (savedTxn.slipImageUrl) msg += `🖼️ รูปสลิป: [ดูรูปภาพ](${savedTxn.slipImageUrl})\n`;
      msg += `💳 **ยอดคงเหลือ: ${balance.currentBalance.toLocaleString('th-TH')} บาท**\n`;
      if (budgetAlert) msg += `\n${budgetAlert}`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
      return;
    }

    const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    pendingDrafts.set(draftId, {
      id: draftId,
      transaction: validation.transaction,
      createdAt: Date.now(),
    });

    if (dupCheck.isDuplicate) {
      let warn = `⚠️ **${dupCheck.reason}**\n\n`;
      warn += `${typeLabel} ยอด: **${txn.amount.toLocaleString('th-TH')} บาท**\n`;
      warn += `📅 วันที่: ${dayjs(txn.date).format('DD/MM/YYYY')} ${txn.time}\n`;
      if (txn.merchant) warn += `🏪 ร้านค้า/ผู้รับ: ${txn.merchant}\n`;
      if (txn.slipImageUrl) warn += `🖼️ รูปสลิป: [ดูรูปภาพ](${txn.slipImageUrl})\n`;
      warn += `\nต้องการบันทึกอีกครั้งไหม?`;
      await ctx.reply(warn, {
        parse_mode: 'Markdown',
        reply_markup: createDuplicateWarningKeyboard(draftId),
      });
      return;
    }

    let card = `🧾 **อ่านสลิปแล้ว**\n\n`;
    card += `${typeLabel} **${txn.amount.toLocaleString('th-TH')} บาท**\n`;
    if (txn.merchant) card += `🏪 ผู้รับ/ร้านค้า: ${txn.merchant}\n`;
    card += `🍜 หมวดหมู่: ${txn.category}\n`;
    card += `📝 รายละเอียด: ${txn.description}\n`;
    card += `📅 วันที่: ${dayjs(txn.date).format('DD/MM/YYYY')}\n`;
    card += `⏰ เวลา: ${txn.time}\n`;
    card += `💳 บัญชี: ${txn.account}\n`;
    if (txn.reference) card += `🔢 Ref: \`${txn.reference}\`\n`;
    if (txn.slipImageUrl) card += `🖼️ รูปสลิป: [ดูรูปภาพ](${txn.slipImageUrl})\n`;
    card += `\nต้องการบันทึกหรือไม่?`;

    await ctx.reply(card, {
      parse_mode: 'Markdown',
      reply_markup: createConfirmationKeyboard(draftId),
    });
  } catch (error) {
    console.error('[Slip Handler Error]', error);
    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply('⚠️ ไม่สามารถดาวน์โหลดหรืออ่านสลิปได้ กรุณาลองใหม่อีกครั้งครับ');
  }
}

export async function handleVoiceMessage(ctx: Context): Promise<void> {
  const voice = ctx.message?.voice;
  if (!voice) return;

  const userId = ctx.from?.id.toString() || '';
  const now = getBangkokNow();
  const todayStr = now.format('YYYY-MM-DD');
  const timeStr = now.format('HH:mm:ss');

  const waitMsg = await ctx.reply('🎙️ กำลังฟังและประมวลผลเสียงพูดด้วย AI...');

  try {
    const file = await ctx.api.getFile(voice.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${ctx.api.token}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    const categories = await getActiveCategories();
    const settings = await getUserSettings(userId);

    const parsed = await parseVoiceMessage(audioBuffer, voice.mime_type || 'audio/ogg', categories, todayStr);

    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});

    if (parsed.intent === 'clarification_needed' || !parsed.amount) {
      await ctx.reply(parsed.clarificationQuestion || '🎙️ ฟังจำนวนเงินไม่ชัดเจน กรุณาลองอัดเสียงใหม่อีกครั้งครับ');
      return;
    }

    const validation = validateTransactionData(parsed, {
      telegramMessageId: ctx.message!.message_id,
      createdBy: userId,
      source: 'manual',
      defaultAccount: settings.defaultAccount,
      todayDateStr: todayStr,
      currentTimeStr: timeStr,
    });

    if (!validation.isValid || !validation.transaction) {
      await ctx.reply(`⚠️ ${validation.error}`);
      return;
    }

    const existing = await getAllTransactions();
    const dupCheck = checkDuplicateTransaction(validation.transaction, existing);

    const txn = validation.transaction;
    const typeLabel = txn.type === 'expense' ? '💸 รายจ่าย' : '💰 รายรับ';

    // Check Auto-Save mode
    if (settings.slipMode === 'auto_save' && !dupCheck.isDuplicate) {
      const savedTxn = await appendTransaction(txn);
      const allTxns = await getAllTransactions();
      const balance = calculateBalance(settings.startingBalance, allTxns);
      const monthStr = now.format('YYYY-MM');
      const monthly = calculateMonthlySummary(monthStr, allTxns, settings.startingBalance);
      const budgetAlert = checkBudgetAlert(settings, monthly.totalExpense);

      let msg = `⚡ **[Auto-Save] บันทึกเสียงพูดเรียบร้อย!**\n\n`;
      msg += `${typeLabel}: **${savedTxn.amount.toLocaleString('th-TH')} บาท**\n`;
      msg += `🍜 หมวดหมู่: ${savedTxn.category}\n`;
      msg += `📝 รายละเอียด: ${savedTxn.description}\n`;
      msg += `💳 **ยอดคงเหลือ: ${balance.currentBalance.toLocaleString('th-TH')} บาท**\n`;
      if (budgetAlert) msg += `\n${budgetAlert}`;

      await ctx.reply(msg, { parse_mode: 'Markdown' });
      return;
    }

    const draftId = `draft_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    pendingDrafts.set(draftId, {
      id: draftId,
      transaction: txn,
      createdAt: Date.now(),
    });

    let card = `🎙️ **ได้ยินเสียงพูดแล้ว**\n\n`;
    card += `${typeLabel}: **${txn.amount.toLocaleString('th-TH')} บาท**\n`;
    card += `🍜 หมวดหมู่: ${txn.category}\n`;
    card += `📝 รายละเอียด: ${txn.description}\n`;
    card += `💳 บัญชี: ${txn.account}\n`;
    card += `📅 วันที่: ${dayjs(txn.date).format('DD/MM/YYYY')}\n\n`;
    card += `ต้องการบันทึกไหม?`;

    await ctx.reply(card, {
      parse_mode: 'Markdown',
      reply_markup: createConfirmationKeyboard(draftId),
    });
  } catch (error) {
    console.error('[Voice Handler Error]', error);
    await ctx.api.deleteMessage(ctx.chat!.id, waitMsg.message_id).catch(() => {});
    await ctx.reply('⚠️ เกิดข้อผิดพลาดในการประมวลผลเสียง กรุณาลองใหม่อีกครั้งครับ');
  }
}

export async function handleCallbackQuery(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery?.data;
  if (!data) return;

  await ctx.answerCallbackQuery();

  // Cancel deletion
  if (data === 'delete_cancel') {
    await ctx.editMessageText('❌ ยกเลิกการลบรายการเรียบร้อยแล้วครับ');
    return;
  }

  // Confirm delete
  if (data.startsWith('delete_confirm_')) {
    const txnId = data.replace('delete_confirm_', '');
    try {
      const deleted = await deleteTransactionById(txnId);
      if (deleted) {
        await ctx.editMessageText(`🗑️ ลบรายการ \`${txnId}\` ออกจาก Google Sheets สำเร็จแล้วครับ`, {
          parse_mode: 'Markdown',
        });
      } else {
        await ctx.editMessageText('⚠️ ไม่พบรายการดังกล่าวในระบบ หรือรายการอาจถูกลบไปแล้ว');
      }
    } catch (error) {
      console.error('[Delete Error]', error);
      await ctx.editMessageText('⚠️ เกิดข้อผิดพลาดในการลบรายการจาก Google Sheets ครับ');
    }
    return;
  }

  // Cancel draft
  if (data.startsWith('cancel_')) {
    const draftId = data.replace('cancel_', '');
    pendingDrafts.delete(draftId);
    await ctx.editMessageText('❌ ยกเลิกรายการแล้วครับ');
    return;
  }

  // Edit draft request
  if (data.startsWith('edit_')) {
    const draftId = data.replace('edit_', '');
    const draft = pendingDrafts.get(draftId);
    if (!draft) {
      await ctx.reply('⚠️ รายการนี้หมดอายุแล้ว กรุณาส่งใหม่อีกครั้งครับ');
      return;
    }
    await ctx.reply(
      `✏️ ต้องการแก้ไขข้อมูลส่วนใดครับ?\nพิมพ์ข้อความใหม่ เช่น:\n\`เปลี่ยนเป็น 65 บาท\` หรือ \`เปลี่ยนหมวดเป็น ของขวัญ / แฟน\``,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Confirm or Force Confirm draft
  if (data.startsWith('confirm_') || data.startsWith('force_confirm_')) {
    const draftId = data.replace('force_confirm_', '').replace('confirm_', '');
    
    // Protection against rapid double clicks
    const alreadyProcessed = processedDrafts.get(draftId);
    if (alreadyProcessed) {
      await ctx.answerCallbackQuery({ text: 'รายการนี้ได้รับการบันทึกไปแล้วครับ' });
      return;
    }

    const draft = pendingDrafts.get(draftId);

    if (!draft) {
      await ctx.editMessageText('⚠️ รายการนี้อาจได้รับการบันทึกไปแล้ว หรือหมดอายุครับ สามารถพิมพ์ใหม่อีกครั้งได้เลยครับ');
      return;
    }

    try {
      // 1. Commit to Google Sheets (Source of Truth)
      const savedTxn = await appendTransaction(draft.transaction);
      pendingDrafts.delete(draftId);

      // 2. Fetch live updated balance from Google Sheets
      const allTxns = await getAllTransactions();
      const settings = await getUserSettings(savedTxn.createdBy);
      const balance = calculateBalance(settings.startingBalance, allTxns);

      const typeEmoji = savedTxn.type === 'expense' ? '💸' : '💰';
      let confirmMsg = `✅ **บันทึกข้อมูลลง Google Sheets เรียบร้อย!**\n\n`;
      confirmMsg += `${typeEmoji} **${savedTxn.amount.toLocaleString('th-TH')} บาท**\n`;
      confirmMsg += `🍜 หมวดหมู่: ${savedTxn.category}\n`;
      confirmMsg += `📝 รายละเอียด: ${savedTxn.description}\n`;
      if (savedTxn.slipImageUrl) confirmMsg += `🖼️ รูปสลิป: [ดูรูปภาพ](${savedTxn.slipImageUrl})\n`;
      confirmMsg += `💳 **ยอดคงเหลือล่าสุด: ${balance.currentBalance.toLocaleString('th-TH')} บาท**\n`;

      processedDrafts.set(draftId, confirmMsg);
      await ctx.editMessageText(confirmMsg, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error('[Sheets Save Error]', error);
      // Section 39: If Google Sheets save fails, DO NOT say success
      await ctx.editMessageText(
        '⚠️ **ยังบันทึกรายการไม่ได้**\n\nเกิดข้อผิดพลาดในการเชื่อมต่อ Google Sheets ข้อมูลยังไม่ถูกบันทึกครับ',
        { parse_mode: 'Markdown' }
      );
    }
  }
}

