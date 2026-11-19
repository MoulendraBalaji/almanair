import { describe, expect, it } from 'vitest';
import { actions } from '@/data';
import { kgCo2e, micrograms } from '@/data/parse';
import type { DoseResult } from '@/domain/exposure/dose';
import { buildReceipt, planReceipt } from '@/domain/impact/receipt';

const byId = (id: string) => {
  const found = actions.find((action) => action.id === id);
  if (!found) throw new Error(`Missing action ${id}`);
  return found;
};

const dose = (central: number, low: number, high: number): DoseResult => ({
  central: micrograms(central),
  low: micrograms(low),
  high: micrograms(high),
  hourly: [],
});

const terms = (actionId: string) => ({
  action: byId(actionId),
  before: dose(100, 80, 120),
  after: dose(80, 60, 100),
  emissionsBefore: kgCo2e(10),
  emissionsAfter: kgCo2e(7),
  exposureLabelKey: 'receipt.exposure',
  emissionsLabelKey: 'receipt.emissions',
});

describe('impact receipts', () => {
  it('explains exposure and emissions deltas without health claims', () => {
    const receipt = buildReceipt(terms('shortWindows'));
    expect(receipt.actionId).toBe('shortWindows');
    expect(receipt.exposureDelta).toBe(-20);
    expect(receipt.exposurePercent).toBe(-20);
    expect(receipt.emissionsDelta).toBe(-3);
    expect(receipt.exposureLow).toBe(60);
    expect(receipt.exposureHigh).toBe(100);
    expect(receipt.lines).toEqual([
      { labelKey: 'receipt.exposure', value: -20, unitKey: 'units.microgramsPerDay' },
      { labelKey: 'receipt.emissions', value: -3, unitKey: 'units.kgPerWeek' },
    ]);
  });

  it('uses the weakest confidence among referenced factors', () => {
    expect(buildReceipt(terms('shortWindows')).confidence).toBe('low');
    expect(buildReceipt(terms('wasteSeparate')).confidence).toBe('medium');
    const highAction = { ...byId('walkShort'), effectRefs: ['car-co2e-per-km'] };
    expect(buildReceipt({ ...terms('walkShort'), action: highAction }).confidence).toBe('high');
  });

  it('avoids division by zero for an empty baseline', () => {
    const receipt = buildReceipt({ ...terms('pledge'), before: dose(0, 0, 0) });
    expect(receipt.exposurePercent).toBe(0);
  });

  it('builds a whole-day plan comparison', () => {
    const comparison = planReceipt({
      before: dose(500, 400, 600),
      after: dose(400, 320, 480),
      emissionsBefore: kgCo2e(20),
      emissionsAfter: kgCo2e(15),
    });
    expect(comparison.exposureDelta).toBe(-100);
    expect(comparison.exposurePercent).toBe(-20);
    expect(comparison.emissionsDelta).toBe(-5);
  });
});
