import { describe, expect, it } from 'vitest';
import { standardById, standards } from '@/data';
import { micrograms } from '@/data/parse';
import { fromCategory, fromConcentration, fromIndex, interpolate, severityKey, toSeverity, type Severity } from '@/domain/aqi';
import { expectNear, unwrap } from './helpers';

interface ConcentrationCase {
  standardId: string;
  concentration: number;
  index: number;
  severity: Severity;
  bandId: string;
}

const concentrationCases: readonly ConcentrationCase[] = [
  { standardId: 'us-epa', concentration: 0, index: 0, severity: 0, bandId: 'us-good' },
  { standardId: 'us-epa', concentration: 9, index: 50, severity: 0, bandId: 'us-good' },
  { standardId: 'us-epa', concentration: 35.4, index: 100, severity: 1, bandId: 'us-moderate' },
  { standardId: 'india-cpcb', concentration: 30, index: 50, severity: 0, bandId: 'in-good' },
  { standardId: 'india-cpcb', concentration: 90, index: 200, severity: 2, bandId: 'in-moderate' },
  { standardId: 'india-cpcb', concentration: 500, index: 500, severity: 5, bandId: 'in-severe' },
];

describe('AQI banding', () => {
  it('maps every ordinal to a stable message key', () => {
    for (const severity of [0, 1, 2, 3, 4, 5] as const) expect(severityKey(severity)).toBe(`severity.${String(severity)}`);
    expect(toSeverity(-3)).toBe(0);
    expect(toSeverity(4)).toBe(4);
    expect(toSeverity(99)).toBe(5);
  });

  it('interpolates and clamps breakpoint pairs', () => {
    expect(interpolate({ value: 25, low: 0, high: 50, outputLow: 0, outputHigh: 100 })).toBe(50);
    expect(interpolate({ value: -5, low: 0, high: 50, outputLow: 10, outputHigh: 110 })).toBe(10);
    expect(interpolate({ value: 80, low: 0, high: 50, outputLow: 10, outputHigh: 110 })).toBe(110);
    expect(interpolate({ value: 2, low: 5, high: 5, outputLow: 7, outputHigh: 9 })).toBe(7);
  });

  it.each(concentrationCases)('converts $concentration µg/m³ on $standardId', (testCase) => {
    const reading = unwrap(fromConcentration(standardById(testCase.standardId), micrograms(testCase.concentration)));
    expect(reading.index).toBeCloseTo(testCase.index, 6);
    expect(reading.severity).toBe(testCase.severity);
    expect(reading.bandId).toBe(testCase.bandId);
    expect(reading.concentration).toBe(testCase.concentration);
  });

  it('converts index values and clamps above the highest band', () => {
    const standard = standardById('us-epa');
    const moderate = unwrap(fromIndex(standard, 75));
    expect(moderate.severity).toBe(1);
    expectNear(moderate.concentration, 21.981632653061226, 0.000001);
    const beyond = unwrap(fromIndex(standard, 900));
    expect(beyond.index).toBe(900);
    expect(beyond.severity).toBe(5);
    expect(beyond.bandId).toBe('us-hazardous');
  });

  it('builds every category from the middle of its index band', () => {
    for (const standard of standards) {
      for (const severity of [0, 1, 2, 3, 4, 5] as const) {
        const reading = unwrap(fromCategory(standard, severity));
        expect(reading.severity).toBe(severity);
      }
    }
  });

  it('returns typed errors for invalid input', () => {
    expect(fromConcentration(standardById('us-epa'), micrograms(-1))).toEqual({ ok: false, error: 'negative-concentration' });
    expect(fromIndex(standardById('us-epa'), -1)).toEqual({ ok: false, error: 'negative-concentration' });
    expect(fromCategory({ ...standardById('us-epa'), bands: [] }, 0)).toEqual({ ok: false, error: 'unknown-severity' });
  });

  it('reports empty standards and clamps values beyond every band', () => {
    const empty = { ...standardById('us-epa'), bands: [] };
    expect(fromConcentration(empty, micrograms(10))).toEqual({ ok: false, error: 'empty-standard' });
    expect(fromIndex(empty, 10)).toEqual({ ok: false, error: 'empty-standard' });
    expect(unwrap(fromConcentration(standardById('us-epa'), micrograms(1000))).bandId).toBe('us-hazardous');
    expect(unwrap(fromIndex(standardById('us-epa'), 1000)).bandId).toBe('us-hazardous');
  });

  it('rejects a severity that the selected standard does not publish', () => {
    const standard = standardById('us-epa');
    const partial = { ...standard, bands: standard.bands.filter((band) => band.severity === 0) };
    expect(fromCategory(partial, 5)).toEqual({ ok: false, error: 'unknown-severity' });
  });
});
