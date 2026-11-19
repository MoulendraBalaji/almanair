import { describe, expect, it } from 'vitest';
import { count as parsedCount } from '@/data/parse';
import {
  addCarbon,
  addHours,
  addMass,
  ach,
  count,
  cubicMetres,
  divideMassByTime,
  hours,
  kgCo2e,
  makeRatio,
  micrograms,
  ratio,
  scaleCarbon,
  scaleHours,
  scaleMass,
  scaleVolume,
  subtractMass,
  type ACH,
  type Count,
} from '@/domain/units';
import { fixedClock } from '@/domain/time/clock';
import { err, isOk, ok } from '@/domain/result';

describe('typed unit arithmetic', () => {
  it('adds, scales and divides physical quantities', () => {
    expect(addMass(micrograms(10), micrograms(5))).toBe(15);
    expect(subtractMass(micrograms(10), micrograms(5))).toBe(5);
    expect(scaleMass(micrograms(10), ratio(0.5))).toBe(5);
    expect(divideMassByTime(micrograms(20), hours(4))).toBe(5);
    expect(addHours(hours(2), hours(3))).toBe(5);
    expect(scaleHours(hours(4), ratio(0.25))).toBe(1);
    expect(scaleVolume(cubicMetres(20), ratio(2))).toBe(40);
    expect(addCarbon(kgCo2e(2), kgCo2e(3))).toBe(5);
    expect(scaleCarbon(kgCo2e(8), ratio(0.5))).toBe(4);
    expect(makeRatio(1, 4)).toBe(0.25);
    const exchange: ACH = ach(4);
    const people: Count = count(3);
    expect(exchange).toBe(4);
    expect(people).toBe(3);
    expect(parsedCount(2)).toBe(2);
  });
});

describe('supporting domain primitives', () => {
  it('narrows results explicitly', () => {
    const success = ok(5);
    const failure = err('bad-input');
    expect(isOk(success)).toBe(true);
    expect(isOk(failure)).toBe(false);
    if (isOk(success)) expect(success.value).toBe(5);
    if (!isOk(failure)) expect(failure.error).toBe('bad-input');
  });

  it('injects a deterministic clock', () => {
    const instant = new Date('2026-01-15T09:00:00.000Z');
    expect(fixedClock(instant).now()).toBe(instant);
  });
});
