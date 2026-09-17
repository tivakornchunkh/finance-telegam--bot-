import { getConfig } from './config/config.js';
import { initializeSpreadsheet } from './sheets/client.js';
import { createBot, registerBotCommands } from './bot/telegram.js';
import { startReminderScheduler } from './reminder/scheduler.js';

async function bootstrap() {
  console.log('====================================================');
  console.log(' 🚀 Starting Personal Finance Telegram Bot...');
  console.log('====================================================');

  const config = getConfig();

  // 1. Initialize Google Sheets
  try {
    console.log(`[Init] Connecting to Google Sheet: ${config.GOOGLE_SHEET_ID}...`);
    await initializeSpreadsheet();
    console.log('[Init] Google Sheets connected and verified successfully.');
  } catch (error) {
    console.error('[Init Error] Failed to initialize Google Sheets. Bot will still launch for offline handlers.', error);
  }

  // 2. Setup Bot
  const bot = createBot();
  await registerBotCommands(bot);

  // 3. Start Schedulers
  startReminderScheduler(bot);

  // 4. Start Telegram Bot Polling with Resilience
  async function startWithRetry() {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
      console.log(`[Init] Starting Telegram Bot with polling...`);
      await bot.start({
        drop_pending_updates: true,
        onStart: (botInfo) => {
          console.log(`[Ready] Bot @${botInfo.username} is running and listening for messages!`);
        },
      });
    } catch (err: any) {
      if (err?.error_code === 409 || err?.message?.includes('409')) {
        console.warn('[Warning] Telegram 409 Conflict detected. Retrying in 5 seconds...');
        await new Promise((r) => setTimeout(r, 5000));
        return startWithRetry();
      }
      console.error('[Bot Start Error]', err);
    }
  }

  startWithRetry();

  // Graceful shutdown
  const stop = async () => {
    console.log('\n[Shutdown] Stopping bot gracefully...');
    await bot.stop();
    process.exit(0);
  };

  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

bootstrap().catch((err) => {
  console.error('[Fatal Error during startup]', err);
  process.exit(1);
});

