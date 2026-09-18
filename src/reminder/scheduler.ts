import cron from 'node-cron';
import { Bot } from 'grammy';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';
import { getConfig } from '../config/config.js';
import { getAllTransactions } from '../sheets/transactions.js';
import { getUserSettings } from '../sheets/settings.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Bangkok';

export async function runDailyReminderCheck(
  bot: Bot,
  forceReminderType?: 'first' | 'second'
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const config = getConfig();
    const now = dayjs().tz(TIMEZONE);
    const currentTimeStr = now.format('HH:mm');
    const todayDateStr = now.format('YYYY-MM-DD');

    const userId = config.AUTHORIZED_TELEGRAM_USER_ID;
    if (!userId || userId === '0') return { sent: false, reason: 'Invalid user ID' };

    const settings = await getUserSettings(userId);
    if (!settings.reminderEnabled) return { sent: false, reason: 'Reminders disabled in settings' };

    const targetReminder1 = settings.reminderTime || config.REMINDER_TIME;
    const targetReminder2 = settings.secondReminderTime || config.SECOND_REMINDER_TIME;

    let reminderToSend = forceReminderType;
    if (!reminderToSend) {
      if (currentTimeStr === targetReminder1) reminderToSend = 'first';
      else if (currentTimeStr === targetReminder2) reminderToSend = 'second';
    }

    if (!reminderToSend) return { sent: false, reason: 'Not reminder time yet' };

    // Check if user already logged any transaction today
    const allTxns = await getAllTransactions();
    const hasTransactionToday = allTxns.some(
      (t) => t.date === todayDateStr && t.createdBy === userId
    );

    if (hasTransactionToday) {
      return { sent: false, reason: 'Transactions already logged today' };
    }

    if (reminderToSend === 'first') {
      const message =
        `🔔 **ถึงเวลาส่งยอดวันนี้แล้วครับ**\n\n` +
        `วันนี้มีรายรับหรือรายจ่ายอะไรบ้าง?\n` +
        `ส่งเป็นข้อความสั้นๆ เช่น \`จ่าย 60 ข้าว\` หรือส่งรูปสลิปมาได้เลย 📷`;
      await bot.api.sendMessage(userId, message, { parse_mode: 'Markdown' });
      console.log(`[Reminder] Sent first reminder to ${userId}`);
      return { sent: true, reason: 'First reminder sent' };
    } else {
      const message =
        `⚠️ **วันนี้ยังไม่ได้ส่งยอดนะ**\n\n` +
        `อย่าลืมบันทึกรายรับ/รายจ่ายก่อนนอนครับ\n` +
        `ส่งข้อความหรือรูปสลิปมาได้เลย 📷`;
      await bot.api.sendMessage(userId, message, { parse_mode: 'Markdown' });
      console.log(`[Reminder] Sent second reminder to ${userId}`);
      return { sent: true, reason: 'Second reminder sent' };
    }
  } catch (error) {
    console.error('[Reminder Error]', error);
    return { sent: false, reason: String(error) };
  }
}

export function startReminderScheduler(bot: Bot): void {
  // Run every minute to check if reminder time has arrived
  cron.schedule('* * * * *', async () => {
    await runDailyReminderCheck(bot);
  });

  console.log('[Reminder] Scheduler started for timezone Asia/Bangkok');
}

