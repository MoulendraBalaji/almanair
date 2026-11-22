/** Best-effort per-client limits plus one shared global daily cap. */
import { config } from '@/config';
import { logWarn } from './log';

/** One rolling minute bucket and one fixed daily bucket per client key. */
interface Bucket {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}

/** Result of one admission check. */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** An atomic shared daily counter; remote implementations may fail open. */
export interface GlobalLimitStore {
  /** Increments the counter and reports whether this request is admitted. */
  tryAcquire(key: string, now: number): Promise<boolean>;
}

/** Validated Upstash REST connection settings. */
interface UpstashSettings {
  endpoint: string;
  token: string;
}

/** In-memory buckets; keys are truncated client identifiers, never prompt text. */
const buckets = new Map<string, Bucket>();

/** One full day expressed in the configured time units. */
const dayMs = (): number => config.rateLimit.windowMs * config.math.minutesPerHour * config.math.hoursPerDay;

/** Removes buckets that can no longer affect a decision. */
const prune = (now: number): void => {
  for (const [key, bucket] of buckets) {
    if (now - bucket.dayStart > dayMs()) buckets.delete(key);
  }
};

/** Picks the first non-empty trusted header value, else a shared local key. */
const firstNonEmpty = (...values: readonly (string | undefined)[]): string =>
  values.find((value) => value !== undefined && value !== '') ?? 'local';

/** Extracts a bounded client identifier from trusted proxy headers only. */
export const clientKey = (request: Request): string => {
  const forwarded = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim();
  const realIp = request.headers.get('x-real-ip')?.trim();
  return firstNonEmpty(forwarded, realIp).slice(0, config.rateLimit.clientKeyMaxChars);
};

/** Admits one request or reports the retry delay. */
export const checkRateLimit = (key: string, now: number = Date.now()): RateLimitResult => {
  prune(now);
  const bucket = buckets.get(key) ?? { minuteStart: now, minuteCount: 0, dayStart: now, dayCount: 0 };
  if (now - bucket.minuteStart >= config.rateLimit.windowMs) {
    bucket.minuteStart = now;
    bucket.minuteCount = 0;
  }
  if (now - bucket.dayStart >= dayMs()) {
    bucket.dayStart = now;
    bucket.dayCount = 0;
  }
  if (bucket.minuteCount >= config.rateLimit.perMinute || bucket.dayCount >= config.rateLimit.dailyCap) {
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds: config.rateLimit.retryAfterSeconds };
  }
  bucket.minuteCount += 1;
  bucket.dayCount += 1;
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSeconds: 0 };
};

/** Test-only reset for deterministic rate-limit cases. */
export const resetRateLimit = (): void => {
  buckets.clear();
};

/** Reads optional Upstash REST settings without throwing. */
const upstashSettings = (): UpstashSettings | undefined => {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return undefined;
  try {
    const base = url.endsWith('/') ? url : `${url}/`;
    return { endpoint: new URL('/pipeline', base).toString(), token };
  } catch {
    return undefined;
  }
};

/** Reads the counter from the first result of an Upstash REST pipeline. */
const counterFrom = (payload: unknown): number | undefined => {
  if (!Array.isArray(payload) || typeof payload[0] !== 'object' || payload[0] === null) return undefined;
  const value: unknown = Reflect.get(payload[0], 'result');
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** One shared key per UTC day; one instance-wide counter without Upstash. */
let memoryDay = '';
let memoryCount = 0;

/** In-memory fallback used when Upstash is not configured. */
const memoryStore: GlobalLimitStore = {
  tryAcquire: (key) => {
    if (key !== memoryDay) {
      memoryDay = key;
      memoryCount = 0;
    }
    memoryCount += 1;
    return Promise.resolve(memoryCount <= config.rateLimit.globalDailyCap);
  },
};

/** Upstash REST implementation: atomic INCR and a bounded TTL per day key. */
const upstashStore = (settings: UpstashSettings): GlobalLimitStore => ({
  tryAcquire: async (key) => {
    const response = await fetch(settings.endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${settings.token}`, 'content-type': 'application/json' },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, config.rateLimit.globalDailyTtlSeconds],
      ]),
      signal: AbortSignal.timeout(config.chat.timeoutMs),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`[chat] global store status ${String(response.status)}`);
    const count = counterFrom(await response.json());
    if (count === undefined) throw new Error('[chat] global store returned no counter');
    return count <= config.rateLimit.globalDailyCap;
  },
});

/** Injected test store; undefined selects Upstash when configured, else memory. */
let injectedStore: GlobalLimitStore | undefined;

/** Resolves the active store without caching environment settings. */
const activeStore = (): GlobalLimitStore => {
  if (injectedStore) return injectedStore;
  const settings = upstashSettings();
  return settings ? upstashStore(settings) : memoryStore;
};

/** One UTC-day key shared by every caller and serverless instance. */
export const globalDayKey = (now: number = Date.now()): string =>
  `almanair:chat:global:${new Date(now).toISOString().split('T')[0] ?? 'unknown'}`;

/** Test-only injection; pass undefined to restore automatic store selection. */
export const setGlobalLimitStore = (store: GlobalLimitStore | undefined): void => {
  injectedStore = store;
};

/** Admits one request against the global cap; store errors fail open. */
export const checkGlobalLimit = async (now: number = Date.now()): Promise<boolean> => {
  try {
    return await activeStore().tryAcquire(globalDayKey(now), now);
  } catch (error) {
    logWarn('[chat] global limit store unavailable', { name: error instanceof Error ? error.name : 'UnknownError' });
    return true;
  }
};

/** Test-only reset of injected and in-memory global limit state. */
export const resetGlobalLimit = (): void => {
  injectedStore = undefined;
  memoryDay = '';
  memoryCount = 0;
};
