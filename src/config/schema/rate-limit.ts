import { z } from 'zod';
import { positive } from './common';

/** Per-client and global admission limits. */
export const rateLimitSchema = z.object({
  perMinute: positive,
  windowMs: positive,
  dailyCap: positive,
  globalDailyCap: positive,
  globalDailyTtlSeconds: positive,
  retryAfterSeconds: positive,
  clientKeyMaxChars: positive,
});
