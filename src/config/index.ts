import { z } from 'zod';
import raw from './app.json';

/** All limits, budgets and timeouts are named, typed and validated at boot. */
const positive = z.number().int().positive();

const appConfigSchema = z.object({
  budgets: z.object({
    firstLoadJsGzipKb: positive,
    fullDayPlanMs: positive,
    planDigestTokens: positive,
    chartPoints: positive,
  }),
  chat: z.object({
    timeoutMs: positive,
    maxBodyBytes: positive,
    maxOutputTokens: positive,
    temperature: z.number().min(0).max(1),
  }),
  rateLimit: z.object({
    perMinute: positive,
    windowMs: positive,
    dailyCap: positive,
    retryAfterSeconds: positive,
  }),
  ui: z.object({
    persistenceDebounceMs: positive,
    receiptStaggerMs: positive,
    countUpMs: positive,
    hazeDriftSeconds: positive,
    knowledgeTopK: positive,
    defaultMinutesPerDay: positive,
  }),
  ventilation: z.object({ halfWidthHours: positive }),
  retrieval: z.object({ k1: z.number().positive(), b: z.number().min(0).max(1) }),
  storage: z.object({ maxBytes: positive, version: positive }),
  math: z.object({
    midpoint: z.number().min(0).max(1),
    hoursPerDay: positive,
    minutesPerHour: positive,
    daysPerWeek: positive,
    gramsPerKg: positive,
    percent: positive,
    defaultRoomVolume: positive,
    decimals: z.number().int().nonnegative(),
  }),
});

/** Parsed application configuration; invalid values fail fast with a zod error. */
export const config = appConfigSchema.parse(raw);

/** Configuration shape, derived from the schema. */
export type AppConfig = z.infer<typeof appConfigSchema>;
