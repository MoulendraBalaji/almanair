/** Validated local-only persistence for the versioned profile. */
import { config } from '@/config';
import { parseProfile, type Profile } from '@/domain/profile';
import { err, ok, type Result } from '@/domain/result';

/** Stable reasons a local read or write can fail. */
export type StorageError = 'unavailable' | 'missing' | 'invalid' | 'too-large';

const localStore = (): Storage | undefined => {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/** Reads and validates the stored profile without trusting its shape. */
export const loadProfile = (): Result<Profile, StorageError> => {
  const store = localStore();
  if (!store) return err('unavailable');
  let raw: string | null;
  try {
    raw = store.getItem(config.storage.key);
  } catch {
    return err('unavailable');
  }
  if (raw === null) return err('missing');
  const value: unknown = JSON.parse(raw);
  const parsed = parseProfile(value);
  return parsed.ok ? ok(parsed.value) : err('invalid');
};

/** Writes only a validated profile and enforces the configured byte budget. */
export const saveProfile = (profile: Profile): Result<true, StorageError> => {
  const store = localStore();
  if (!store) return err('unavailable');
  if (!parseProfile(profile).ok) return err('invalid');
  const raw = JSON.stringify(profile);
  if (new TextEncoder().encode(raw).length > config.storage.maxBytes) return err('too-large');
  try {
    store.setItem(config.storage.key, raw);
    return ok(true);
  } catch {
    return err('unavailable');
  }
};

/** Removes the stored profile; failures are reported but never thrown. */
export const clearProfile = (): Result<true, 'unavailable'> => {
  const store = localStore();
  if (!store) return err('unavailable');
  try {
    store.removeItem(config.storage.key);
    return ok(true);
  } catch {
    return err('unavailable');
  }
};
