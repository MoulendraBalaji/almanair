/** Age-appropriate inhalation rates converted from daily to hourly units. */
import { config } from '@/config';
import type { Member } from '@/domain/profile';
import { factorRange, type FactorRange } from './factors';

/** Rate envelopes in cubic metres per hour. */
export interface BreathingRates {
  resting: FactorRange;
  active: FactorRange;
}

const hourly = (range: FactorRange, unit: string): FactorRange => {
  if (!unit.endsWith('/day')) return range;
  const divisor = config.math.hoursPerDay;
  return { low: range.low / divisor, central: range.central / divisor, high: range.high / divisor };
};

const read = (id: string, unit: string): FactorRange => hourly(factorRange(id), unit);

/** Builds resting and active envelopes for one household member. */
export const breathingFor = (member: Member): BreathingRates => {
  const restingId = `breathing-${member.ageBand}`;
  const activeId = member.ageBand === 'child' ? 'breathing-moderate-child' : 'breathing-moderate-adult';
  return {
    resting: read(restingId, 'm³/day'),
    active: read(activeId, 'm³/h'),
  };
};
