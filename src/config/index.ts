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
    maxQuestionChars: positive,
    maxDigestChars: positive,
    serverErrorStatus: positive,
    temperature: z.number().min(0).max(1),
  }),
  rateLimit: z.object({
    perMinute: positive,
    windowMs: positive,
    dailyCap: positive,
    retryAfterSeconds: positive,
    statusCode: positive,
  }),
  ui: z.object({
    persistenceDebounceMs: positive,
    receiptStaggerMs: positive,
    countUpMs: positive,
    hazeDriftSeconds: positive,
    knowledgeTopK: positive,
    defaultMinutesPerDay: positive,
    setupSteps: positive,
    topActions: positive,
    suggestedQuestions: positive,
  }),
  ventilation: z.object({ halfWidthHours: positive }),
  schedule: z.object({
    sleepStartHour: z.number().int().min(0).max(23),
    sleepEndHour: z.number().int().min(0).max(23),
    outdoorHours: z.array(z.number().int().min(0).max(23)),
    tripHours: z.array(z.number().int().min(0).max(23)),
    quietSeverity: z.number().int().min(0).max(5),
    morningEndHour: z.number().int().min(0).max(23),
    eveningStartHour: z.number().int().min(0).max(23),
  }),
  retrieval: z.object({ k1: z.number().positive(), b: z.number().min(0).max(1) }),
  storage: z.object({ key: z.string().min(1), maxBytes: positive, version: positive }),
  math: z.object({
    midpoint: z.number().min(0).max(1),
    hoursPerDay: positive,
    minutesPerHour: positive,
    daysPerWeek: positive,
    gramsPerKg: positive,
    percent: positive,
    defaultRoomVolume: positive,
    decimals: z.number().int().nonnegative(),
    latitudeLimit: positive,
    longitudeLimit: positive,
    minUtcOffsetHours: z.number().min(-24).max(0),
    maxUtcOffsetHours: z.number().min(0).max(24),
  }),
});

/** Parsed application configuration; invalid values fail fast with a zod error. */
export const config = appConfigSchema.parse(raw);

/** Configuration shape, derived from the schema. */
export type AppConfig = z.infer<typeof appConfigSchema>;
