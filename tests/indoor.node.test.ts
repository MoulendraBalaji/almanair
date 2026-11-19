import { describe, expect, it } from 'vitest';
import { ach, cubicMetres, micrograms, ratio } from '@/data/parse';
import { purifierCount, requiredCadr, steadyState, type IndoorTerms } from '@/domain/indoor/model';
import { expectNear, unwrap } from './helpers';

const baseTerms = (): IndoorTerms => ({
  outdoor: micrograms(100),
  volume: cubicMetres(20),
  penetration: ratio(0.8),
  airExchange: ach(0.5),
  deposition: ach(0.2),
  sourceRate: micrograms(0),
  cadr: cubicMetres(0),
});

describe('indoor mass balance', () => {
  it('computes the source-free steady state', () => {
    const value = unwrap(steadyState(baseTerms()));
    expectNear(value, 40 / 0.7, 0.000001);
  });

  it('includes clean-air delivery and indoor sources', () => {
    const value = unwrap(steadyState({ ...baseTerms(), cadr: cubicMetres(60), sourceRate: micrograms(1000) }));
    expectNear(value, 90 / 3.7, 0.000001);
  });

  it('returns typed errors for invalid rooms', () => {
    expect(steadyState({ ...baseTerms(), volume: cubicMetres(0) })).toEqual({ ok: false, error: 'non-positive-volume' });
    expect(
      steadyState({ ...baseTerms(), airExchange: ach(0), deposition: ach(0), cadr: cubicMetres(0) }),
    ).toEqual({ ok: false, error: 'negative-removal' });
  });

  it('sizes purifiers by target air changes per hour', () => {
    expect(requiredCadr(cubicMetres(20), ach(4.9))).toBeCloseTo(98, 6);
    expect(purifierCount(cubicMetres(20), ach(4.9), cubicMetres(60))).toBe(2);
    expect(purifierCount(cubicMetres(20), ach(4.9), cubicMetres(0))).toBe(0);
  });
});
