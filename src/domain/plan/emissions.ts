/** Transport and household-energy CO2e comparison for one day. */
import { config } from '@/config';
import { estimateCarbon } from '@/domain/emissions';
import { kgCo2e, type KgCo2e } from '@/data/parse';
import type { Profile } from '@/domain/profile';
import { factorPoint } from './factors';

/** Daily and weekly emissions for the current and lower-emission day. */
export interface EmissionsSnapshot {
  before: KgCo2e;
  after: KgCo2e;
  weeklyDelta: KgCo2e;
  sourceIds: readonly string[];
}

type Fuel = Profile['home']['cookingFuel'];
type Mode = Profile['mobility']['modes'][number];

/** Optional swaps used when scoring a specific action. */
export interface EmissionsOverrides {
  mode?: Mode;
  fuel?: Fuel;
}

const cleanerFuel = (fuel: Fuel): Fuel => (fuel === 'biomass' || fuel === 'kerosene' ? 'electric' : fuel);
const cleanerMode = (mode: Mode): Mode => (mode === 'car' ? 'walk' : mode === 'bus' ? 'bicycle' : mode);

const dailyTotal = (profile: Profile, mode: Mode, fuel: Fuel): KgCo2e => {
  const distance = profile.mobility.schoolRunKm + profile.mobility.commuteKm;
  const cooking = factorPoint('cooking-energy-per-day');
  const heating = factorPoint('heating-energy-per-day');
  return kgCo2e(
    estimateCarbon(mode, distance).daily +
      estimateCarbon(fuel, cooking).daily +
      estimateCarbon(profile.home.heatingFuel, heating).daily,
  );
};

/** Builds the conservative illustrative emissions swap used by the plan. */
export const emissionsFor = (profile: Profile, overrides: EmissionsOverrides = {}): EmissionsSnapshot => {
  const mode = overrides.mode ?? profile.mobility.modes[0] ?? 'walk';
  const fuel = overrides.fuel ?? profile.home.cookingFuel;
  const before = dailyTotal(profile, mode, fuel);
  const after = dailyTotal(profile, cleanerMode(mode), cleanerFuel(fuel));
  return {
    before,
    after,
    weeklyDelta: kgCo2e((after - before) * config.math.daysPerWeek),
    sourceIds: [
      'car-co2e-per-km',
      'bus-co2e-per-km',
      'walk-co2e-per-km',
      'bicycle-co2e-per-km',
      'cooking-energy-per-day',
      'heating-energy-per-day',
      'electricity-co2e-per-kwh',
    ],
  };
};
