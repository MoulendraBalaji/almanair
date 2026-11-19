/** Non-identifying facts consumed by the declarative action rules. */
import type { Reading } from '@/domain/aqi';
import type { Facts } from '@/domain/recommender/predicate';
import type { Profile } from '@/domain/profile';

const primaryMode = (profile: Profile): string => profile.mobility.modes.find((item) => item !== 'walk') ?? 'walk';

/** Builds the complete fact map for a profile and reading. */
export const factsFor = (profile: Profile, reading: Reading): Facts => ({
  'home.windowHabit': profile.home.windowHabit,
  'home.cookingFuel': profile.home.cookingFuel,
  'home.hasPurifier': String(profile.home.hasPurifier),
  'home.maskClass': profile.home.maskClass,
  'home.tenure': profile.home.tenure,
  'profile.budgetTier': profile.budgetTier,
  'mobility.modes': primaryMode(profile),
  'mobility.schoolRunKm': profile.mobility.schoolRunKm,
  'mobility.commuteKm': profile.mobility.commuteKm,
  'reading.severity': reading.severity,
  'reading.index': reading.index,
});
