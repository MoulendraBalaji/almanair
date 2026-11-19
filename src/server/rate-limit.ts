/** Best-effort per-client limits; Vercel instances do not share this map. */
import { config } from '@/config';

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

/** Extracts a bounded, non-content client identifier from proxy headers. */
export const clientKey = (request: Request): string => {
  const forwarded = request.headers.get('x-forwarded-for');
  const candidate = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'local';
  return candidate.slice(0, config.rateLimit.clientKeyMaxChars);
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
