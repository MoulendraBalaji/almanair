/** Composed exports for the deterministic golden profile matrix. */
import { goldenInstant, goldenReadings, type GoldenProfile } from './base';
import { firstProfiles } from './profiles-a';
import { lastProfiles } from './profiles-b';

export { goldenInstant, goldenReadings };
export type { GoldenProfile };

/** Eight profiles vary region, household, fuel, tenure, budget and mask use. */
export const goldenProfiles: readonly GoldenProfile[] = [...firstProfiles, ...lastProfiles];
