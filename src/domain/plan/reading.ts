/** Converts the user's stored reading into a validated scale reading. */
import { standards } from '@/data';
import { micrograms } from '@/data/parse';
import { fromCategory, fromConcentration, fromIndex, toSeverity, type Reading } from '@/domain/aqi';
import { isOk } from '@/domain/result';
import type { Profile } from '@/domain/profile';

const standardFor = (id: string, fallbackId: string) => {
  const found = standards.find((standard) => standard.id === id) ?? standards.find((standard) => standard.id === fallbackId);
  if (!found) throw new Error('No AQI standard is configured');
  return found;
};

/** Returns the reading, or undefined when the stored input is incomplete. */
export const readingFor = (profile: Profile): Reading | undefined => {
  const input = profile.reading;
  if (!input) return undefined;
  const standard = standardFor(input.standardId, profile.preferences.standardId);
  if (input.kind === 'category') {
    if (input.category === undefined) return undefined;
    const result = fromCategory(standard, input.category);
    return isOk(result) ? result.value : undefined;
  }
  if (input.value === undefined) return undefined;
  const result = input.kind === 'aqi' ? fromIndex(standard, input.value) : fromConcentration(standard, micrograms(input.value));
  return isOk(result) ? result.value : undefined;
};

/** Supplies a neutral baseline so the rest of the plan can still be computed. */
export const readingOrBaseline = (profile: Profile): Reading => {
  const existing = readingFor(profile);
  if (existing) return existing;
  const standard = standardFor(profile.preferences.standardId, profile.preferences.standardId);
  const severity = toSeverity(standard.bands[0]?.severity ?? 0);
  const result = fromCategory(standard, severity);
  if (!isOk(result)) throw new Error('The selected standard has no usable band');
  return result.value;
};
