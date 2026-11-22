import { describe, expect, it } from 'vitest';
import { diurnalProfiles } from '@/data';
import { micrograms, ratio } from '@/data/parse';
import type { Activity, DoseTerms, MicroenvironmentTerms } from '@/domain/exposure/dose';
import { doseScenario, microenvironment } from '@/domain/exposure/dose';
import { outdoorProfile, profileExtremes, type HourlyPoint } from '@/domain/exposure/profile';
import { diurnalProfileSchema } from '@/data/schema';

const point = (hour: number, value: number): HourlyPoint => ({ hour, concentration: micrograms(value) });
const profile = (id: string) => {
  const found = diurnalProfiles.find((item) => item.id === id);
  if (!found) throw new Error(`Missing profile ${id}`);
  return found;
};

const environment = (overrides: Partial<MicroenvironmentTerms>): MicroenvironmentTerms => ({
  point: point(0, 100),
  indoor: micrograms(10),
  vehicleRatio: 0.5,
  activity: 'indoor',
  mask: 0,
  ...overrides,
});

describe('hourly exposure profile', () => {
  it('preserves the daily mean exactly for a flat shape', () => {
    const hours = outdoorProfile(micrograms(40), profile('all-day'));
    expect(hours).toHaveLength(24);
    expect(hours.every((item) => item.concentration === 40)).toBe(true);
    expect(profileExtremes(hours)).toEqual({ peak: hours[0], low: hours[0] });
  });

  it('returns no points for a zero shape', () => {
    const flat = profile('all-day');
    const zero = diurnalProfileSchema.parse({
      id: 'zero',
      labelKey: flat.labelKey,
      shape: flat.shape.map(() => 0),
      source: flat.source,
    });
    expect(outdoorProfile(micrograms(100), zero)).toEqual([]);
  });

  it('scales a morning shape and finds its extremes', () => {
    const hours = outdoorProfile(micrograms(100), profile('morning'));
    const mean = hours.reduce((sum, item) => sum + item.concentration, 0) / hours.length;
    expect(mean).toBeCloseTo(100, 6);
    expect(profileExtremes(hours).peak?.hour).toBe(8);
    expect(profileExtremes(hours).low?.hour).toBe(3);
    expect(profileExtremes([])).toEqual({ peak: undefined, low: undefined });
  });
});

describe('hourly microenvironment', () => {
  const cases: readonly { activity: Activity; expected: number; vehicleRatio?: number; mask?: number }[] = [
    { activity: 'indoor', expected: 10 },
    { activity: 'sleep', expected: 10 },
    { activity: 'outdoor', expected: 100 },
    { activity: 'vehicle', expected: 50 },
    { activity: 'exercise', expected: 100 },
    { activity: 'outdoor', expected: 80, mask: 0.2 },
    { activity: 'indoor', expected: 10, mask: 0.2 },
    { activity: 'sleep', expected: 10, mask: 0.2 },
    { activity: 'vehicle', expected: 40, mask: 0.2 },
    { activity: 'exercise', expected: 80, mask: 0.2 },
  ];

  it.each(cases)('uses $activity concentration and mask reduction', (testCase) => {
    expect(
      microenvironment(environment({ activity: testCase.activity, vehicleRatio: testCase.vehicleRatio ?? 0.5, mask: testCase.mask ?? 0 })),
    ).toBeCloseTo(testCase.expected, 6);
  });
});

describe('dose scenarios', () => {
  const terms = (hours: readonly HourlyPoint[], schedule: readonly Activity[]): DoseTerms => ({
    outdoor: hours,
    indoor: { low: micrograms(5), central: micrograms(10), high: micrograms(20) },
    breathing: { low: 1, central: 2, high: 3 },
    activeBreathing: { low: 4, central: 5, high: 6 },
    vehicleRatio: { low: 0.5, central: 1, high: 1.5 },
    maskReduction: ratio(0),
    schedule,
  });

  it('keeps low, central and high ordered across a full day', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => point(hour, 100));
    const result = doseScenario(terms(hours, Array.from({ length: 24 }, () => 'indoor' as const)));
    expect(result.low).toBe(120);
    expect(result.central).toBe(480);
    expect(result.high).toBe(1440);
    expect(result.hourly).toHaveLength(24);
    expect(result.hourly.every((value) => value === 20)).toBe(true);
  });

  it('uses active breathing and the vehicle ratio in transit', () => {
    const result = doseScenario(terms([point(0, 100)], ['vehicle']));
    expect(result.low).toBe(200);
    expect(result.central).toBe(500);
    expect(result.high).toBe(900);
  });

  it('defaults missing schedule entries to indoor', () => {
    const result = doseScenario(terms([point(0, 100)], []));
    expect(result.central).toBe(20);
  });

  it('gives an all-indoor day the same dose with and without a mask', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => point(hour, 200));
    const schedule = Array.from({ length: 24 }, () => 'indoor' as const);
    const unmasked = doseScenario({ ...terms(hours, schedule), maskReduction: ratio(0) });
    const masked = doseScenario({ ...terms(hours, schedule), maskReduction: ratio(0.665) });
    expect(masked).toEqual(unmasked);
  });

  it('reduces an outdoor-heavy day when a mask is worn', () => {
    const hours = Array.from({ length: 24 }, (_, hour) => point(hour, 100));
    const schedule = Array.from({ length: 24 }, () => 'outdoor' as const);
    const unmasked = doseScenario({ ...terms(hours, schedule), maskReduction: ratio(0) });
    const masked = doseScenario({ ...terms(hours, schedule), maskReduction: ratio(0.5) });
    expect(masked.central).toBeCloseTo(unmasked.central * 0.5, 6);
    expect(masked.low).toBeCloseTo(unmasked.low * 0.5, 6);
    expect(masked.high).toBeCloseTo(unmasked.high * 0.5, 6);
  });
});
