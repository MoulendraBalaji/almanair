/** Shared types and constants for the golden profile matrix. */
import type { Severity } from '@/domain/aqi';
import { defaultProfile, type Profile } from '@/domain/profile';

export interface GoldenProfile {
  id: string;
  retrievalQuery: string;
  profile: Profile;
}

export interface GoldenReading {
  id: string;
  severity: Severity;
}

/** One fixed instant keeps solar position and local-hour logic reproducible. */
export const goldenInstant = new Date('2026-01-15T06:00:00Z');

/** Low, mid and severe readings exercise every guidance and schedule branch. */
export const goldenReadings: readonly GoldenReading[] = [
  { id: 'low', severity: 0 },
  { id: 'mid', severity: 2 },
  { id: 'severe', severity: 5 },
];

/** Fresh defaults for each profile fixture. */
export const baseProfile = (): Profile => defaultProfile();
