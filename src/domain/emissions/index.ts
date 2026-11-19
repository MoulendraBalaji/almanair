/** Activity-to-CO2e arithmetic and sourced qualitative local-pollutant tiers. */
import { config } from '@/config';
import { factorById, localTiers } from '@/data';
import { kgCo2e, type KgCo2e } from '@/data/parse';

/** Transport modes and household fuels supported by the factors catalogue. */
export type ActivityKind = 'walk' | 'bicycle' | 'bus' | 'car' | 'biomass' | 'kerosene' | 'lpg' | 'gas' | 'electric';

/** A weekly climate estimate with its confidence and local-pollutant tier. */
export interface CarbonEstimate {
  daily: KgCo2e;
  weekly: KgCo2e;
  factorId: string;
  confidence: 'high' | 'medium' | 'low';
  localTier: 'lower' | 'similar' | 'higher';
}

/** Looks up the correct climate factor id for a transport or fuel kind. */
export const resolveFactorId = (kind: ActivityKind): string => {
  if (kind === 'walk' || kind === 'bicycle' || kind === 'bus' || kind === 'car') return `${kind}-co2e-per-km`;
  if (kind === 'electric') return 'electricity-co2e-per-kwh';
  return `${kind}-co2e-per-kwh`;
};

/** Multiplies an amount by a factor and scales to a week. */
export const estimateCarbon = (kind: ActivityKind, amountPerDay: number): CarbonEstimate => {
  const factorId = resolveFactorId(kind);
  const factor = factorById(factorId);
  const value = factor.value ?? factor.central ?? 0;
  const daily = kgCo2e(value * amountPerDay);
  const tier = localTiers.find((item) => item.kind === kind);
  return {
    daily,
    weekly: kgCo2e(daily * config.math.daysPerWeek),
    factorId,
    confidence: factor.confidence,
    localTier: tier?.tier ?? 'similar',
  };
};

/** A before-and-after activity pair. */
export interface Swap {
  from: ActivityKind;
  fromAmount: number;
  to: ActivityKind;
  toAmount: number;
}

/** Estimates the climate effect of swapping one activity for another. */
export const swapCarbon = (swap: Swap): KgCo2e => {
  const before = estimateCarbon(swap.from, swap.fromAmount).daily;
  const after = estimateCarbon(swap.to, swap.toAmount).daily;
  return kgCo2e(after - before);
};

/** Scales one household's estimate to a community of households. */
export const scaleToHouseholds = (weekly: KgCo2e, households: number): KgCo2e => kgCo2e(weekly * households);
