/** Shared global daily cap with an Upstash store and an in-memory fallback. */
import { config } from '@/config';
import type { GlobalLimitStore } from './types';

/** Validated Upstash REST connection settings. */
interface UpstashSettings {
  endpoint: string;
  token: string;
}

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
export const activeStore = (): GlobalLimitStore => {
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

/** Test-only reset of injected and in-memory global limit state. */
export const resetGlobalLimit = (): void => {
  injectedStore = undefined;
  memoryDay = '';
  memoryCount = 0;
};
