import { describe, expect, it } from 'vitest';
import { cubicMetres, kgCo2e } from '@/data/parse';
import { cleanAirRoom, communityTypeSchema, playbookFor, playbookSourceFor, scaledWeeklyImpact } from '@/domain/community';
import { estimateCarbon, resolveFactorId, scaleToHouseholds, swapCarbon, type ActivityKind } from '@/domain/emissions';

const factorCases: readonly { kind: ActivityKind; factorId: string }[] = [
  { kind: 'walk', factorId: 'walk-co2e-per-km' },
  { kind: 'bicycle', factorId: 'bicycle-co2e-per-km' },
  { kind: 'bus', factorId: 'bus-co2e-per-km' },
  { kind: 'car', factorId: 'car-co2e-per-km' },
  { kind: 'biomass', factorId: 'biomass-co2e-per-kwh' },
  { kind: 'kerosene', factorId: 'kerosene-co2e-per-kwh' },
  { kind: 'lpg', factorId: 'lpg-co2e-per-kwh' },
  { kind: 'gas', factorId: 'gas-co2e-per-kwh' },
  { kind: 'electric', factorId: 'electricity-co2e-per-kwh' },
];

describe('carbon estimates', () => {
  it.each(factorCases)('resolves $kind to a catalogue factor id', ({ kind, factorId }) => {
    expect(resolveFactorId(kind)).toBe(factorId);
  });

  it('labels car travel with its sourced climate factor and local tier', () => {
    const estimate = estimateCarbon('car', 10);
    expect(estimate.daily).toBeCloseTo(1.6984, 6);
    expect(estimate.weekly).toBeCloseTo(11.8888, 6);
    expect(estimate.confidence).toBe('high');
    expect(estimate.localTier).toBe('higher');
  });

  it('keeps zero operational emissions explicit for active travel', () => {
    const walk = estimateCarbon('walk', 4);
    expect(walk.daily).toBe(0);
    expect(walk.weekly).toBe(0);
    expect(walk.confidence).toBe('low');
    expect(walk.localTier).toBe('lower');
  });

  it('uses electricity when modelling electric appliances', () => {
    const electric = estimateCarbon('electric', 6);
    expect(electric.factorId).toBe('electricity-co2e-per-kwh');
    expect(electric.daily).toBeCloseTo(1.3521, 6);
    expect(electric.localTier).toBe('lower');
  });

  it('expresses a swap as after minus before and scales weekly totals', () => {
    expect(swapCarbon({ from: 'car', fromAmount: 10, to: 'bus', toAmount: 10 })).toBeCloseTo(-0.6138, 6);
    expect(scaleToHouseholds(kgCo2e(11.8888), 20)).toBeCloseTo(237.776, 6);
  });
});

describe('community planning', () => {
  it('returns sourced playbook steps for a known community type', () => {
    const steps = playbookFor('school');
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) expect(step.taskKey.length).toBeGreaterThan(0);
    expect(playbookFor('unknown')).toEqual([]);
  });

  it('validates community types and cites the selected playbook', () => {
    expect(communityTypeSchema.safeParse('school').success).toBe(true);
    expect(communityTypeSchema.safeParse('unknown').success).toBe(false);
    const source = playbookSourceFor('school');
    expect(source?.id.length).toBeGreaterThan(0);
    expect(playbookSourceFor('unknown')).toBeUndefined();
  });

  it('rounds scaled weekly estimates to the configured precision', () => {
    expect(scaledWeeklyImpact(kgCo2e(1.234), 10)).toBe(12.34);
  });

  it('derives clean-air-room purifier count from the EPA-based ACH target', () => {
    const room = cleanAirRoom(cubicMetres(20), cubicMetres(60));
    expect(room.targetAch).toBeCloseTo(4.9, 6);
    expect(room.requiredCadr).toBeCloseTo(98, 6);
    expect(room.purifiers).toBe(2);
    expect(cleanAirRoom(cubicMetres(20), cubicMetres(0)).purifiers).toBe(0);
  });
});
