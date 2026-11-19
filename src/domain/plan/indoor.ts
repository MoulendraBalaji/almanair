/** Sourced steady-state indoor estimates for the largest room. */
import { ach, cubicMetres, micrograms, ratio, type Micrograms } from '@/data/parse';
import { purifierCount, requiredCadr, steadyState, type IndoorTerms } from '@/domain/indoor/model';
import type { Profile, Room } from '@/domain/profile';
import { factorPoint, factorRange, type FactorRange } from './factors';

/** Inputs that one action may change without rewriting the profile. */
export interface IndoorOverrides {
  penetration?: FactorRange;
  airExchange?: FactorRange;
  deposition?: FactorRange;
  sourceRate?: FactorRange;
  cadr?: number;
}

/** The three indoor concentration envelopes and clean-air sizing. */
export interface IndoorValues {
  low: Micrograms;
  central: Micrograms;
  high: Micrograms;
  cadr: number;
  targetAch: number;
  requiredCadr: number;
  unitsNeeded: number;
}

/** Indoor values plus the room and source records that produced them. */
export interface IndoorSnapshot extends IndoorValues {
  room: Room;
  withoutPurifier: Micrograms;
  sourceIds: readonly string[];
}

const largestRoom = (profile: Profile): Room => {
  const found = profile.home.rooms.reduce<Room | undefined>(
    (best, room) => (!best || room.volume > best.volume ? room : best),
    undefined,
  );
  if (!found) throw new Error('The profile has no room');
  return found;
};

/** Only unflued solid or kerosene burning gets the high cooking source term. */
const sourceRangeFor = (profile: Profile): FactorRange => {
  const fuel = profile.home.cookingFuel;
  if (fuel === 'biomass' || fuel === 'kerosene') return factorRange('indoor-source-cooking');
  return { low: 0, central: 0, high: 0 };
};

const solve = (terms: IndoorTerms): Micrograms => {
  const result = steadyState(terms);
  if (!result.ok) throw new Error(result.error);
  return result.value;
};

/** Computes indoor concentration envelopes from factors and optional overrides. */
export const indoorValues = (profile: Profile, outdoor: Micrograms, overrides: IndoorOverrides = {}): IndoorValues => {
  const room = largestRoom(profile);
  const volume = cubicMetres(room.volume);
  const penetration = overrides.penetration ?? factorRange('particle-penetration');
  const airExchange = overrides.airExchange ?? factorRange('air-exchange-rate');
  const deposition = overrides.deposition ?? factorRange('particle-deposition');
  const sourceRate = overrides.sourceRate ?? sourceRangeFor(profile);
  const cadr = overrides.cadr ?? (profile.home.hasPurifier ? profile.home.purifierCadr : 0);
  const targetAch = factorPoint('target-clean-room-ach');
  const terms = (level: keyof FactorRange, cleanAir: number): IndoorTerms => ({
    outdoor,
    volume,
    penetration: ratio(penetration[level]),
    airExchange: ach(airExchange[level]),
    deposition: ach(deposition[level]),
    sourceRate: micrograms(sourceRate[level]),
    cadr: cubicMetres(cleanAir),
  });
  return {
    low: solve(terms('low', cadr)),
    central: solve(terms('central', cadr)),
    high: solve(terms('high', cadr)),
    cadr,
    targetAch,
    requiredCadr: requiredCadr(volume, ach(targetAch)),
    unitsNeeded: profile.home.hasPurifier ? purifierCount(volume, ach(targetAch), cubicMetres(cadr)) : 0,
  };
};

/** Builds the full indoor snapshot for the plan. */
export const indoorFor = (profile: Profile, outdoor: Micrograms): IndoorSnapshot => {
  const values = indoorValues(profile, outdoor);
  return {
    ...values,
    room: largestRoom(profile),
    withoutPurifier: indoorValues(profile, outdoor, { cadr: 0 }).central,
    sourceIds: ['particle-penetration', 'air-exchange-rate', 'particle-deposition', 'indoor-source-clean'],
  };
};
