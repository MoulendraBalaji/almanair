/**
 * Steady-state mass balance. A box model is used because it exposes every
 * assumption as a named term, rather than hiding it in a black-box score.
 */
import { cubicMetres, micrograms, type ACH, type CubicMetres, type Micrograms, type Ratio } from '@/data/parse';
import { err, ok, type Result } from '@/domain/result';

/** Fully specified terms of the indoor mass-balance model. */
export interface IndoorTerms {
  outdoor: Micrograms;
  volume: CubicMetres;
  penetration: Ratio;
  airExchange: ACH;
  deposition: ACH;
  sourceRate: Micrograms;
  cadr: CubicMetres;
}

/** Failure modes for an invalid room specification. */
export type IndoorErrorCode = 'non-positive-volume' | 'negative-removal';

/** Computes C_in = (P·a·C_out + S/V) / (a + k + Q/V). */
export const steadyState = (terms: IndoorTerms): Result<Micrograms, IndoorErrorCode> => {
  if (terms.volume <= 0) return err('non-positive-volume');
  const removal = terms.airExchange + terms.deposition + terms.cadr / terms.volume;
  if (removal <= 0) return err('negative-removal');
  const incoming = terms.penetration * terms.airExchange * terms.outdoor + terms.sourceRate / terms.volume;
  return ok(micrograms(incoming / removal));
};

/** Required clean-air delivery rate in m³/h for a target ACH. */
export const requiredCadr = (volume: CubicMetres, targetAch: ACH): CubicMetres => cubicMetres(targetAch * volume);

/** Whole-number of purifiers needed to reach the target for one unit's CADR. */
export const purifierCount = (volume: CubicMetres, targetAch: ACH, unitCadr: CubicMetres): number =>
  unitCadr <= 0 ? 0 : Math.ceil(requiredCadr(volume, targetAch) / unitCadr);
