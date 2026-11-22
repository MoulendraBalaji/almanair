/** Public rate-limit API; route and test imports remain unchanged. */
import { logWarn } from '../log';
import { clientKey as keyFromRequest } from './client';
import { activeStore, globalDayKey, resetGlobalLimit as resetShared, setGlobalLimitStore as setStore } from './global';
import { checkRateLimit as checkLocal, resetRateLimit as resetLocal } from './local';
import type { GlobalLimitStore as Store, RateLimitResult as Result } from './types';

/** Result of one admission check. */
export type RateLimitResult = Result;

/** An atomic shared daily counter; remote implementations may fail open. */
export type GlobalLimitStore = Store;

/** Extracts a bounded client identifier from trusted proxy headers only. */
export const clientKey = (request: Request): string => keyFromRequest(request);

/** Admits one request or reports the retry delay. */
export const checkRateLimit = (key: string, now: number = Date.now()): RateLimitResult => checkLocal(key, now);

/** Test-only reset for deterministic rate-limit cases. */
export const resetRateLimit = (): void => {
  resetLocal();
};

/** One UTC-day key shared by every caller and serverless instance. */
export { globalDayKey };

/** Test-only injection; pass undefined to restore automatic store selection. */
export const setGlobalLimitStore = (store: GlobalLimitStore | undefined): void => {
  setStore(store);
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
  resetShared();
};
