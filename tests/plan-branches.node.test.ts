import { describe, expect, it } from 'vitest';
import { actions, diurnalProfiles, factorById } from '@/data';
import { micrograms } from '@/data/parse';
import { breathingFor } from '@/domain/plan/breathing';
import { buildCore, buildHours } from '@/domain/plan/build';
import { vehicleRatioFor } from '@/domain/plan/dose';
import { effectFor } from '@/domain/plan/effects';
import { emissionsFor } from '@/domain/plan/emissions';
import { factorPoint, factorRange } from '@/domain/plan/factors';
import { indoorValues } from '@/domain/plan/indoor';
import { localHourFor } from '@/domain/plan/location';
import { buildPlan } from '@/domain/plan';
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

describe('factor envelope fallbacks', () => {
  it('collapses point values and reads only the central estimate', () => {
    expect(factorRange('who-pm25-24h-aqg')).toEqual({ low: 15, central: 15, high: 15 });
    expect(factorPoint('mask-n95-filtration')).toBe(factorById('mask-n95-filtration').central);
  });

  it('uses age-specific breathing rates and device-specific vehicle ratios', () => {
    expect(breathingFor({ id: 'child', ageBand: 'child', flags: [] }).resting.central).toBeLessThan(
      breathingFor({ id: 'adult', ageBand: 'adult', flags: [] }).resting.central,
    );
    const car = defaultProfile();
    const bus: Profile = { ...car, mobility: { ...car.mobility, modes: ['bus'] } };
    expect(vehicleRatioFor(bus).central).toBeLessThan(vehicleRatioFor(car).central);
  });
});

describe('plan fallbacks', () => {
  it('falls back to the preferred standard and first diurnal profile', () => {
    const profile = withSeverity(3);
    profile.reading = { kind: 'category', category: 3, standardId: 'unknown-standard' };
    profile.preferences.standardId = 'us-epa';
    profile.preferences.diurnalProfileId = 'unknown-profile';
    const plan = buildPlan(profile, instant);
    expect(plan.standardId).toBe('us-epa');
    expect(profile.preferences.diurnalProfileId).not.toBe(diurnalProfiles[0]?.id);
    expect(plan.outdoor).toHaveLength(diurnalProfiles[0]?.shape.length ?? 0);
  });

  it('does not schedule a vehicle hour for a walking-only profile', () => {
    const profile = withSeverity(3);
    profile.mobility = { modes: ['walk'], schoolRunKm: 0, commuteKm: 10 };
    const plan = buildPlan(profile, instant);
    expect(plan.usualSchedule.every((activity) => activity !== 'vehicle')).toBe(true);
  });

  it('marks an unread profile as a baseline plan', () => {
    const profile = defaultProfile();
    expect(buildPlan(profile, instant).hasReading).toBe(false);
  });

  it('uses neutral hourly values when a schedule is shorter than the outdoor profile', () => {
    const core = buildCore(withSeverity(3), instant);
    const hours = buildHours({
      ...core,
      usual: [],
      adjusted: [],
      baselineDose: { ...core.baselineDose, hourly: [] },
      adjustedDose: { ...core.adjustedDose, hourly: [] },
    });
    expect(hours).toHaveLength(core.outdoor.length);
    expect(
      hours.every(
        (hour) =>
          hour.usualActivity === 'indoor' &&
          hour.adjustedActivity === 'indoor' &&
          hour.usualDose === 0 &&
          hour.adjustedDose === 0,
      ),
    ).toBe(true);
  });
});

describe('location fallbacks', () => {
  it('uses custom coordinates only with a known standard', () => {
    const profile = withSeverity(3);
    profile.regionId = 'custom';
    profile.customRegion = {
      latitude: 10,
      longitude: 20,
      utcOffsetHours: 5.5,
      timezone: 'Asia/Kolkata',
      standardId: 'us-epa',
    };
    expect(buildPlan(profile, instant).location.id).toBe('custom');
    profile.customRegion.standardId = 'unknown-standard';
    expect(buildPlan(profile, instant).location.id).toBe('delhi');
  });

  it('falls back to the first region and wraps negative local hours', () => {
    const profile = withSeverity(3);
    profile.regionId = 'unknown';
    expect(buildCore(profile, instant).location.id).toBe('delhi');
    expect(localHourFor(new Date('2026-01-15T01:00:00Z'), -2)).toBe(23);
  });
});

describe('indoor override branches', () => {
  it('adds a solid-fuel source term and honours purifier settings', () => {
    const lpg = withSeverity(3);
    const biomass: Profile = { ...lpg, home: { ...lpg.home, cookingFuel: 'biomass' } };
    expect(buildPlan(biomass, instant).indoor.central).toBeGreaterThan(buildPlan(lpg, instant).indoor.central);
    const unused = withSeverity(3);
    unused.home.hasPurifier = false;
    unused.home.purifierCadr = 500;
    expect(buildPlan(unused, instant).indoor.cadr).toBe(0);
    const empty = withSeverity(3);
    empty.home.hasPurifier = true;
    empty.home.purifierCadr = 0;
    expect(buildPlan(empty, instant).indoor.unitsNeeded).toBe(0);
  });

  it('accepts every named model override', () => {
    const profile = withSeverity(4);
    const outdoor = micrograms(90);
    const baseline = indoorValues(profile, outdoor);
    const overrides = [
      { penetration: factorRange('particle-penetration') },
      { airExchange: factorRange('air-exchange-rate') },
      { deposition: factorRange('particle-deposition') },
      { sourceRate: factorRange('indoor-source-clean') },
      { cadr: 40 },
    ];
    for (const override of overrides) {
      const result = indoorValues(profile, outdoor, override);
      expect(result.central).toBeGreaterThanOrEqual(0);
      expect(result.central).toBeLessThanOrEqual(baseline.central * (override.cadr === undefined ? 1.5 : 1));
    }
  });
});

describe('mask and emissions branches', () => {
  it('changes dose with mask class without changing the profile identity', () => {
    const none = withSeverity(4);
    const cloth: Profile = { ...none, home: { ...none.home, hasMask: true, maskClass: 'cloth' } };
    const n95: Profile = { ...none, home: { ...none.home, hasMask: true, maskClass: 'n95' } };
    expect(buildPlan(cloth, instant).baselineDose.central).toBeLessThan(buildPlan(none, instant).baselineDose.central);
    expect(buildPlan(n95, instant).baselineDose.central).toBeLessThan(buildPlan(cloth, instant).baselineDose.central);
  });

  it('only swaps fuels and modes when a cleaner option is available', () => {
    const car = withSeverity(3);
    car.mobility = { modes: ['car'], schoolRunKm: 0, commuteKm: 10 };
    expect(emissionsFor(car).after).toBeLessThan(emissionsFor(car).before);
    const bus: Profile = { ...car, mobility: { ...car.mobility, modes: ['bus'] } };
    expect(emissionsFor(bus).after).toBeLessThan(emissionsFor(bus).before);
    const biomass: Profile = { ...car, home: { ...car.home, cookingFuel: 'biomass' } };
    expect(emissionsFor(biomass).after).toBeLessThan(emissionsFor(biomass).before);
    const lpg: Profile = { ...car, home: { ...car.home, cookingFuel: 'lpg' }, mobility: { modes: ['walk'], schoolRunKm: 0, commuteKm: 0 } };
    expect(emissionsFor(lpg).after).toBe(emissionsFor(lpg).before);
  });

  it('falls back to walking when no travel mode is selected', () => {
    const profile = withSeverity(3);
    profile.mobility = { modes: [], schoolRunKm: 0, commuteKm: 10 };
    expect(emissionsFor(profile).before).toBeGreaterThan(0);
  });

  it('remaps vehicle hours for active travel and tolerates a zero baseline', () => {
    const profile = withSeverity(3);
    profile.mobility = { modes: ['car'], schoolRunKm: 0, commuteKm: 10 };
    const action = actions.find((item) => item.id === 'walkShort');
    if (!action) throw new Error('Missing active-travel action');
    const context = effectContextFor(profile);
    const zeroBaseline = {
      ...context.baselineDose,
      low: micrograms(0),
      central: micrograms(0),
      high: micrograms(0),
      hourly: [],
    };
    const effect = effectFor(action, { ...context, baselineDose: zeroBaseline });
    expect(effect.actionId).toBe('walkShort');
    expect(effect.receipt.exposurePercent).toBe(0);
  });
});
