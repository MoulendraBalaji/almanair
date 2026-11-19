/** Hourly microenvironment dose with an explicit low/high input envelope. */
import { micrograms, type Micrograms, type Ratio } from '@/data/parse';
import type { HourlyPoint } from './profile';

/** Where a household member spends an hour. */
export type Activity = 'sleep' | 'indoor' | 'outdoor' | 'vehicle' | 'exercise';

/** Named inputs for one dose scenario. */
export interface DoseTerms {
  outdoor: readonly HourlyPoint[];
  indoor: { low: Micrograms; central: Micrograms; high: Micrograms };
  breathing: { low: number; central: number; high: number };
  activeBreathing: { low: number; central: number; high: number };
  vehicleRatio: { low: number; central: number; high: number };
  maskReduction: Ratio;
  schedule: readonly Activity[];
}

/** Inhaled mass with an envelope that is explicitly not a confidence interval. */
export interface DoseResult {
  low: Micrograms;
  central: Micrograms;
  high: Micrograms;
  hourly: readonly number[];
}

const active = (activity: Activity): boolean => activity === 'exercise' || activity === 'vehicle';

/** Inputs for one hourly microenvironment calculation. */
export interface MicroenvironmentTerms {
  point: HourlyPoint;
  indoor: Micrograms;
  vehicleRatio: number;
  activity: Activity;
  mask: number;
}

/** Concentration in the microenvironment for one hour. */
export const microenvironment = (terms: MicroenvironmentTerms): number => {
  const base =
    terms.activity === 'indoor' || terms.activity === 'sleep'
      ? terms.indoor
      : terms.point.concentration * (terms.activity === 'vehicle' ? terms.vehicleRatio : 1);
  return base * (1 - terms.mask);
};

/** Sums hourly concentration × breathing rate × one hour. */
export const doseScenario = (terms: DoseTerms): DoseResult => {
  const hourly: number[] = [];
  let totalCentral = 0;
  let totalLow = 0;
  let totalHigh = 0;
  terms.outdoor.forEach((point, index) => {
    const activity = terms.schedule[index] ?? 'indoor';
    const rates = active(activity) ? terms.activeBreathing : terms.breathing;
    const shared = { point, vehicleRatio: terms.vehicleRatio.central, activity, mask: terms.maskReduction };
    const value = microenvironment({ ...shared, indoor: terms.indoor.central }) * rates.central;
    hourly.push(value);
    totalCentral += value;
    totalLow += microenvironment({ ...shared, indoor: terms.indoor.low, vehicleRatio: terms.vehicleRatio.low }) * rates.low;
    totalHigh += microenvironment({ ...shared, indoor: terms.indoor.high, vehicleRatio: terms.vehicleRatio.high }) * rates.high;
  });
  return { central: micrograms(totalCentral), low: micrograms(totalLow), high: micrograms(totalHigh), hourly };
};
