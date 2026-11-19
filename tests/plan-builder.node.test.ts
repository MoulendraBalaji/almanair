import { describe, expect, it } from 'vitest';
import { config } from '@/config';
import { sources, standardById } from '@/data';
import { fromCategory, toSeverity } from '@/domain/aqi';
import { buildPlan } from '@/domain/plan';
import { readingFor, readingOrBaseline } from '@/domain/plan/reading';
import { baseSchedule, quietSchedule, timeOfDayFor } from '@/domain/plan/schedule';
import { defaultProfile, type Profile } from '@/domain/profile';
import { unwrap } from './helpers';

const instant = new Date('2026-01-15T06:00:00Z');

const withReading = (): Profile => ({
  ...defaultProfile(),
  reading: { kind: 'category', category: 3, standardId: 'india-cpcb', recordedAt: instant.toISOString() },
});

describe('plan reading conversion', () => {
  it.each([
    { kind: 'category', category: 3, expected: 3 },
    { kind: 'aqi', value: 120, expected: 2 },
    { kind: 'pm25', value: 95, expected: 3 },
  ] as const)('maps $kind input to severity $expected', (reading) => {
    const profile: Profile = { ...defaultProfile(), reading: { ...reading, standardId: 'india-cpcb' } };
    expect(readingFor(profile)?.severity).toBe(reading.expected);
  });

  it.each([
    { kind: 'category', standardId: 'india-cpcb' },
    { kind: 'aqi', standardId: 'india-cpcb' },
    { kind: 'pm25', standardId: 'india-cpcb' },
  ] as const)('treats a missing $kind value as incomplete', (reading) => {
    const profile: Profile = { ...defaultProfile(), reading };
    expect(readingFor(profile)).toBeUndefined();
  });

  it('uses a neutral baseline when the reading is incomplete', () => {
    const profile: Profile = { ...defaultProfile(), reading: { kind: 'pm25', standardId: 'india-cpcb' } };
    expect(readingFor(profile)).toBeUndefined();
    expect(readingOrBaseline(profile)).toEqual(unwrap(fromCategory(standardById('india-cpcb'), 0)));
  });
});

describe('named schedules', () => {
  it('places sleep, trips and outdoor hours from configuration', () => {
    const schedule = baseSchedule(true);
    expect(schedule[config.schedule.sleepEndHour - 1]).toBe('sleep');
    expect(schedule[config.schedule.tripHours[0] ?? 0]).toBe('vehicle');
    expect(schedule[config.schedule.sleepStartHour]).toBe('sleep');
    expect(timeOfDayFor(config.schedule.morningEndHour)).toBe('midday');
    expect(timeOfDayFor(config.schedule.eveningStartHour)).toBe('evening');
  });

  it('quietens outdoor hours from the configured severity', () => {
    const base = baseSchedule(false);
    const calm = quietSchedule(base, toSeverity(config.schedule.quietSeverity - 1));
    const quiet = quietSchedule(base, toSeverity(config.schedule.quietSeverity));
    expect(calm).toEqual(base);
    expect(quiet).not.toEqual(base);
    expect(quiet.every((activity) => activity !== 'outdoor')).toBe(true);
  });
});

describe('indoor and dose composition', () => {
  it('orders the indoor envelope and isolates the purifier effect', () => {
    const plain = buildPlan(withReading(), instant);
    expect(plain.indoor.low).toBeLessThanOrEqual(plain.indoor.central);
    expect(plain.indoor.central).toBeLessThanOrEqual(plain.indoor.high);
    expect(plain.indoor.central).toBe(plain.indoor.withoutPurifier);
    const profile = withReading();
    profile.home.hasPurifier = true;
    profile.home.purifierCadr = 60;
    const cleaned = buildPlan(profile, instant);
    expect(cleaned.indoor.central).toBeLessThan(plain.indoor.central);
    expect(cleaned.indoor.unitsNeeded).toBeGreaterThanOrEqual(1);
  });

  it('keeps dose envelopes ordered and sums the household', () => {
    const one = withReading();
    const two = withReading();
    two.household.push({ id: 'adult-2', ageBand: 'adult', flags: [] });
    const single = buildPlan(one, instant);
    const pair = buildPlan(two, instant);
    expect(single.baselineDose.low).toBeLessThanOrEqual(single.baselineDose.central);
    expect(single.baselineDose.central).toBeLessThanOrEqual(single.baselineDose.high);
    expect(pair.baselineDose.central).toBeGreaterThan(single.baselineDose.central);
    expect(pair.hours).toHaveLength(config.budgets.chartPoints);
  });
});

describe('whole-plan determinism', () => {
  it('produces identical plans for identical inputs', () => {
    const first = buildPlan(withReading(), instant);
    const second = buildPlan(withReading(), instant);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it('returns ranked actions, receipts and resolvable citations', () => {
    const plan = buildPlan(withReading(), instant);
    expect(plan.actions).toHaveLength(config.ui.topActions);
    expect(plan.actions.every((item) => item.effect.receipt.sources.length > 0)).toBe(true);
    expect(plan.sources.length).toBeGreaterThan(0);
    const unknown = plan.sources.filter((source) => !sources.some((entry) => entry.url === source.url));
    expect(unknown.map((source) => source.url), unknown.map((source) => source.id).join(', ')).toEqual([]);
    expect(plan.receipt.exposureDelta).toBeLessThanOrEqual(0);
    expect(plan.emissions.weeklyDelta).toBeLessThanOrEqual(0);
  });

  it('keeps names and coordinates out of the Plan Digest', () => {
    const profile = withReading();
    profile.household[0] = { id: 'private-name', ageBand: 'adult', flags: [] };
    const plan = buildPlan(profile, instant);
    expect(plan.digest).not.toContain('private-name');
    expect(plan.digest).not.toContain('28.6139');
    expect(plan.digest.length).toBeGreaterThan(0);
  });
});
