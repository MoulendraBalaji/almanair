/** Named factor envelopes shared by the plan engines. */
import { factorById } from '@/data';

/** A low/central/high envelope from a sourced factor record. */
export interface FactorRange {
  low: number;
  central: number;
  high: number;
}

/** Reads a factor as an envelope, collapsing point values when necessary. */
export const factorRange = (id: string): FactorRange => {
  const factor = factorById(id);
  const point = factor.value ?? factor.central ?? factor.low ?? 0;
  return {
    low: factor.low ?? point,
    central: factor.central ?? point,
    high: factor.high ?? point,
  };
};

/** Reads the single best estimate of a factor. */
export const factorPoint = (id: string): number => factorRange(id).central;
