/** Mask baseline semantics and the outdoor-mask action receipt. */
import { describe, expect, it } from 'vitest';
import { actions } from '@/data';
import { buildCore } from '@/domain/plan/build';
import { buildPlan } from '@/domain/plan';
import { effectFor } from '@/domain/plan/effects';
import { emissionsFor } from '@/domain/plan/emissions';
import { defaultProfile, type Profile } from '@/domain/profile';

const instant = new Date('2026-01-15T06:00:00Z');

const withSeverity = (severity: 3 | 4): Profile => ({
  ...defaultProfile(),
  reading: { kind: 'category', category: severity, standardId: 'india-cpcb' },
});

const effectContextFor = (profile: Profile) => {
  const core = buildCore(profile, instant);
  return {
    profile,
    outdoorConcentration: core.outdoorConcentration,
    outdoor: core.outdoor,
    indoor: core.indoor,
    schedule: core.usual,
    vehicleRatio: core.vehicleRatio,
    baselineDose: core.baselineDose,
    baselineEmissions: emissionsFor(profile).before,
  };
};

describe('mask baseline and outdoor action', () => {
  it('does not change the baseline just because a mask is owned', () => {
    const none = withSeverity(4);
    const n95: Profile = { ...none, home: { ...none.home, hasMask: true, maskClass: 'n95' } };
    expect(n95.home.maskWearingShare).toBe(0);
    expect(buildPlan(n95, instant).baselineDose.central).toBe(buildPlan(none, instant).baselineDose.central);
  });

  it('changes only the outdoor-heavy dose when a wearing share is stated', () => {
    const base = withSeverity(4);
    const wearing: Profile = {
      ...base,
      home: { ...base.home, hasMask: true, maskClass: 'n95', maskWearingShare: 1 },
    };
    const before = buildPlan(base, instant);
    const after = buildPlan(wearing, instant);
    const nonIndoorHours = (schedule: readonly string[]): number =>
      schedule.filter((activity) => activity !== 'indoor' && activity !== 'sleep').length;
    expect(nonIndoorHours(before.usualSchedule)).toBeGreaterThan(0);
    expect(after.baselineDose.central).toBeLessThan(before.baselineDose.central);
    expect(after.baselineDose.low).toBeLessThan(before.baselineDose.low);
    expect(after.baselineDose.high).toBeLessThan(before.baselineDose.high);
    for (const hour of before.hours) {
      const indoorOrSleep = hour.usualActivity === 'indoor' || hour.usualActivity === 'sleep';
      if (indoorOrSleep) expect(hour.usualDose).toBe(after.hours.find((other) => other.hour === hour.hour)?.usualDose);
    }
  });

  it('gives the outdoor mask action a non-zero bounded receipt', () => {
    const profile = withSeverity(4);
    const masked: Profile = { ...profile, home: { ...profile.home, hasMask: true, maskClass: 'n95', maskWearingShare: 0 } };
    const action = actions.find((entry) => entry.id === 'maskOutdoors');
    if (!action) throw new Error('Missing maskOutdoors action');
    const effect = effectFor(action, effectContextFor(masked));
    expect(effect.receipt.exposureDelta).toBeLessThan(0);
    expect(effect.receipt.exposureAfter).toBeLessThan(effect.receipt.exposureBefore);
    expect(effect.receipt.exposureLow).toBeLessThanOrEqual(effect.receipt.exposureAfter);
    expect(effect.receipt.exposureAfter).toBeLessThanOrEqual(effect.receipt.exposureHigh);
    expect(effect.score).toBeGreaterThan(0);
  });

  it('regresses the old 353 to 118 all-hours masking case', () => {
    const base: Profile = {
      ...defaultProfile(),
      preferences: { ...defaultProfile().preferences, diurnalProfileId: 'all-day', standardId: 'us-epa' },
      reading: { kind: 'category', category: 1, standardId: 'us-epa' },
      household: [
        { id: 'adult-1', ageBand: 'adult', flags: [] },
        { id: 'child-1', ageBand: 'child', flags: [] },
      ],
      mobility: { modes: ['walk'], schoolRunKm: 0, commuteKm: 0 },
    };
    const before = buildPlan(base, instant).baselineDose.central;
    expect(before).toBeCloseTo(352.58, 1);
    // The old all-hours mask bug produced 353 * (1 - 0.95 * 0.7) ≈ 118.
    expect(before * (1 - 0.95 * 0.7)).toBeCloseTo(118.12, 1);
    const masked: Profile = { ...base, home: { ...base.home, hasMask: true, maskClass: 'n95', maskWearingShare: 1 } };
    const after = buildPlan(masked, instant).baselineDose.central;
    expect(after).toBeGreaterThan(300);
    expect(after).toBeLessThan(before);
    expect(after).not.toBeCloseTo(118.12, 0);
  });
});
