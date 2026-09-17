import { Context, NextFunction } from 'grammy';
import { getConfig } from '../config/config.js';

/**
 * Middleware to restrict bot access exclusively to the authorized Telegram user.
 */
export async function authMiddleware(ctx: Context, next: NextFunction): Promise<void> {
  const config = getConfig();
  const userId = ctx.from?.id.toString();

  // If no user ID configured or test mode, proceed
  if (config.AUTHORIZED_TELEGRAM_USER_ID === '0' || !config.AUTHORIZED_TELEGRAM_USER_ID) {
    return next();
  }

  if (userId !== config.AUTHORIZED_TELEGRAM_USER_ID) {
    console.warn(`[Security Alert] Unauthorized access attempt by user ID: ${userId} (@${ctx.from?.username})`);
    await ctx.reply('⛔ บัญชีนี้ไม่ได้รับอนุญาตให้ใช้งานระบบ Personal Finance Bot ครับ');
    return;
  }

  return next();
}

