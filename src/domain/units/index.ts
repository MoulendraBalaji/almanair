/** Public unit API. All constructors live in the single documented cast module. */
export {
  ach,
  count,
  cubicMetres,
  hours,
  kgCo2e,
  micrograms,
  ratio,
  type ACH,
  type Count,
  type CubicMetres,
  type Hours,
  type KgCo2e,
  type Micrograms,
  type Ratio,
} from '@/data/parse';

import { cubicMetres, hours, kgCo2e, micrograms, ratio } from '@/data/parse';
import type { CubicMetres, Hours, KgCo2e, Micrograms, Ratio } from '@/data/parse';

/** Adds two masses. */
export const addMass = (left: Micrograms, right: Micrograms): Micrograms => micrograms(left + right);
/** Scales a mass by a dimensionless ratio. */
export const scaleMass = (mass: Micrograms, factor: Ratio): Micrograms => micrograms(mass * factor);
/** Subtracts two masses. */
export const subtractMass = (left: Micrograms, right: Micrograms): Micrograms => micrograms(left - right);
/** Divides mass by time to obtain a rate. */
export const divideMassByTime = (mass: Micrograms, duration: Hours): Micrograms => micrograms(mass / duration);
/** Adds two durations. */
export const addHours = (left: Hours, right: Hours): Hours => hours(left + right);
/** Scales a duration. */
export const scaleHours = (duration: Hours, factor: Ratio): Hours => hours(duration * factor);
/** Scales a volume. */
export const scaleVolume = (volume: CubicMetres, factor: Ratio): CubicMetres => cubicMetres(volume * factor);
/** Adds two CO2e amounts. */
export const addCarbon = (left: KgCo2e, right: KgCo2e): KgCo2e => kgCo2e(left + right);
/** Scales a CO2e amount. */
export const scaleCarbon = (value: KgCo2e, factor: Ratio): KgCo2e => kgCo2e(value * factor);
/** Builds a ratio from two plain numbers; callers must guarantee a non-zero denominator. */
export const makeRatio = (numerator: number, denominator: number): Ratio => ratio(numerator / denominator);
