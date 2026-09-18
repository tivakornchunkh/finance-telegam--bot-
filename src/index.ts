import http from 'http';
import { webhookCallback } from 'grammy';
import { getConfig } from './config/config.js';
import { initializeSpreadsheet } from './sheets/client.js';
import { createBot, registerBotCommands } from './bot/telegram.js';
import { runDailyReminderCheck, startReminderScheduler } from './reminder/scheduler.js';

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

  // 3. Start Bot in Webhook Mode or Polling Mode
  if (config.BOT_MODE === 'webhook') {
    console.log(`[Mode] Running in WEBHOOK mode on port ${config.PORT}`);

    const webhookHandler = webhookCallback(bot, 'http', {
      secretToken: config.WEBHOOK_SECRET,
    });

    const server = http.createServer(async (req, res) => {
      // Health check endpoint
      if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            status: 'ok',
            bot: 'active',
            mode: 'webhook',
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
          })
        );
      }

      // Cloud Scheduler daily reminder endpoint
      if (req.method === 'POST' && req.url?.startsWith('/api/reminder')) {
        const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        const reminderType = urlObj.searchParams.get('type') as 'first' | 'second' | undefined;
        const result = await runDailyReminderCheck(bot, reminderType);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ status: 'ok', result }));
      }

      // Telegram webhook updates
      if (req.method === 'POST' && (req.url === '/webhook' || req.url === '/')) {
        return webhookHandler(req, res);
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    server.listen(Number(config.PORT), async () => {
      console.log(`[Webhook Server] Listening on port ${config.PORT}`);

      // Auto register webhook with Telegram if WEBHOOK_URL is provided
      if (config.WEBHOOK_URL) {
        try {
          const fullWebhookUrl = `${config.WEBHOOK_URL.replace(/\/$/, '')}/webhook`;
          console.log(`[Webhook] Registering webhook URL with Telegram: ${fullWebhookUrl}...`);
          await bot.api.setWebhook(fullWebhookUrl, {
            secret_token: config.WEBHOOK_SECRET,
            drop_pending_updates: true,
          });
          console.log(`[Webhook] Webhook successfully registered with Telegram!`);
        } catch (webhookErr) {
          console.error('[Webhook Error] Failed to set webhook on Telegram:', webhookErr);
        }
      }
    });

    // Graceful shutdown
    const stop = async () => {
      console.log('\n[Shutdown] Stopping webhook server gracefully...');
      server.close();
      process.exit(0);
    };

    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  } else {
    // Polling mode (Local dev)
    console.log('[Mode] Running in POLLING mode (Local dev)');
    startReminderScheduler(bot);

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
}

bootstrap().catch((err) => {
  console.error('[Fatal Error during startup]', err);
  process.exit(1);
});

