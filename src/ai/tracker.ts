import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import timezone from 'dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

const TIMEZONE = 'Asia/Bangkok';

let currentDate = dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
let dailyRequestCount = 0;
let lastRequestTime: string | null = null;

export function recordAiRequest(): void {
  const today = dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
  if (today !== currentDate) {
    currentDate = today;
    dailyRequestCount = 0;
  }
  dailyRequestCount += 1;
  lastRequestTime = dayjs().tz(TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}

export function getAiUsageStats(): {
  date: string;
  dailyRequests: number;
  dailyLimit: number;
  remainingDaily: number;
  rpmLimit: number;
  lastRequestTime: string | null;
} {
  const today = dayjs().tz(TIMEZONE).format('YYYY-MM-DD');
  if (today !== currentDate) {
    currentDate = today;
    dailyRequestCount = 0;
  }

  const dailyLimit = 1500;
  return {
    date: currentDate,
    dailyRequests: dailyRequestCount,
    dailyLimit,
    remainingDaily: Math.max(0, dailyLimit - dailyRequestCount),
    rpmLimit: 15,
    lastRequestTime,
  };
}

