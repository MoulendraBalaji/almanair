/** Whole-household inhaled-dose estimates with explicit envelopes. */
import { micrograms, ratio, type Micrograms } from '@/data/parse';
import type { Activity, DoseResult, DoseTerms } from '@/domain/exposure/dose';
import { doseScenario } from '@/domain/exposure/dose';
import type { HourlyPoint } from '@/domain/exposure/profile';
import type { Member, Profile } from '@/domain/profile';
import { breathingFor } from './breathing';
import { factorPoint, factorRange, type FactorRange } from './factors';
import type { IndoorValues } from './indoor';

/** All inputs required to compute one comparable dose scenario. */
export interface DoseContext {
  profile: Profile;
  outdoor: readonly HourlyPoint[];
  indoor: IndoorValues;
  schedule: readonly Activity[];
  maskReduction: number;
  vehicleRatio: FactorRange;
}

/** Filtration × fit for a well-fitting mask, before any wearing-share weighting. */
export const outdoorMaskReductionFor = (profile: Profile): number => {
  if (!profile.home.hasMask || profile.home.maskClass === 'none') return 0;
  const filterId = profile.home.maskClass === 'n95' ? 'mask-n95-filtration' : 'mask-cloth-filtration';
  return factorPoint(filterId) * factorPoint('mask-fit-factor');
};

/** Baseline reduction: owning a mask alone contributes nothing; the profile share does. */
const maskReductionFor = (profile: Profile): number => {
  const share = Math.min(1, Math.max(0, profile.home.maskWearingShare));
  return outdoorMaskReductionFor(profile) * share;
};

/** Chooses the in-vehicle envelope from the first non-walking mode. */
export const vehicleRatioFor = (profile: Profile): FactorRange => {
  const mode = profile.mobility.modes.find((item) => item !== 'walk') ?? 'car';
  return factorRange(`vehicle-ratio-${mode}`);
};

/** Inputs needed to assemble a dose context. */
export interface DoseContextInput {
  profile: Profile;
  outdoor: readonly HourlyPoint[];
  indoor: IndoorValues;
  schedule: readonly Activity[];
  /** Optional override used by an action scenario (for example, full outdoor mask use). */
  maskReduction?: number;
}

/** Default dose context for the household's current setup. */
export const doseContextFor = (input: DoseContextInput): DoseContext => ({
  ...input,
  maskReduction: input.maskReduction ?? maskReductionFor(input.profile),
  vehicleRatio: vehicleRatioFor(input.profile),
});

const termsFor = (member: Member, context: DoseContext): DoseTerms => {
  const breathing = breathingFor(member);
  return {
    outdoor: context.outdoor,
    indoor: { low: context.indoor.low, central: context.indoor.central, high: context.indoor.high },
    breathing: breathing.resting,
    activeBreathing: breathing.active,
    vehicleRatio: context.vehicleRatio,
    maskReduction: ratio(context.maskReduction),
    schedule: context.schedule,
  };
};

const sumDose = (values: readonly DoseResult[]): DoseResult => {
  const add = (pick: (result: DoseResult) => number): Micrograms =>
    micrograms(values.reduce((total, value) => total + pick(value), 0));
  const hourly = values[0]?.hourly.map((_value, index) => values.reduce((total, value) => total + (value.hourly[index] ?? 0), 0)) ?? [];
  return { low: add((value) => value.low), central: add((value) => value.central), high: add((value) => value.high), hourly };
};

/** Sums every household member's hourly dose into one household estimate. */
export const doseFor = (context: DoseContext): DoseResult =>
  sumDose(context.profile.household.map((member) => doseScenario(termsFor(member, context))));
