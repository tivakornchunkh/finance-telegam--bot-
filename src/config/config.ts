import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(1, 'TELEGRAM_BOT_TOKEN is required'),
  AUTHORIZED_TELEGRAM_USER_ID: z.string().min(1, 'AUTHORIZED_TELEGRAM_USER_ID is required'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-3.6-flash'),
  GOOGLE_SHEET_ID: z.string().min(1, 'GOOGLE_SHEET_ID is required'),
  GOOGLE_SERVICE_ACCOUNT_KEY_FILE: z.string().default('./service-account.json'),
  GOOGLE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  TIMEZONE: z.string().default('Asia/Bangkok'),
  DEFAULT_ACCOUNT: z.string().default('K PLUS'),
  REMINDER_TIME: z.string().default('20:00'),
  SECOND_REMINDER_TIME: z.string().default('22:00'),
});

export type Config = z.infer<typeof envSchema>;

let parsedConfig: Config | null = null;

export function getConfig(): Config {
  if (!parsedConfig) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
      console.warn(`[Config Warning] Missing or invalid environment variables:\n${issues}`);
      // Fallback object for offline/test environments
      return {
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || 'dummy_token',
        AUTHORIZED_TELEGRAM_USER_ID: process.env.AUTHORIZED_TELEGRAM_USER_ID || '0',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'dummy_key',
        GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID || 'dummy_sheet_id',
        GOOGLE_SERVICE_ACCOUNT_KEY_FILE: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || './service-account.json',
        GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
        TIMEZONE: process.env.TIMEZONE || 'Asia/Bangkok',
        DEFAULT_ACCOUNT: process.env.DEFAULT_ACCOUNT || 'K PLUS',
        REMINDER_TIME: process.env.REMINDER_TIME || '20:00',
        SECOND_REMINDER_TIME: process.env.SECOND_REMINDER_TIME || '22:00',
      };
    }
    parsedConfig = result.data;
  }
  return parsedConfig;
}

