import { describe, expect, it } from 'vitest';
import { solarVectors } from '@/data';
import { micrograms } from '@/data/parse';
import type { HourlyPoint } from '@/domain/exposure/profile';
import {
  apparentLongitude,
  equationOfTime,
  julianCentury,
  obliquityCorrection,
  orbitalTerms,
  solarDeclination,
  solarPosition,
  type SolarPosition,
} from '@/domain/ventilation/solar';
import { longestRun, nearSolarNoon, ventilationWindow } from '@/domain/ventilation/window';
import { expectNear } from './helpers';

const position: SolarPosition = { solarNoonMinutes: 780, sunriseMinutes: 300, sunsetMinutes: 1140 };
const hours = (values: readonly number[]): readonly HourlyPoint[] =>
  values.map((value, hour) => ({ hour, concentration: micrograms(value) }));

describe('NOAA solar position', () => {
  it('produces the known Boulder solstice noon within one minute', () => {
    const vector = solarVectors.find((item) => item.id === 'noaa-boulder-solstice');
    if (!vector) throw new Error('Missing solar vector');
    const result = solarPosition({
      latitude: vector.latitude,
      longitude: vector.longitude,
      date: new Date(vector.date),
      timezoneOffsetHours: vector.timezoneOffsetHours,
    });
    expectNear(result.solarNoonMinutes, vector.expectedSolarNoonMinutes, 1);
    expect(result.sunriseMinutes).toBeLessThan(result.solarNoonMinutes);
    expect(result.sunsetMinutes).toBeGreaterThan(result.solarNoonMinutes);
  });

  it('exposes bounded intermediate orbital terms', () => {
    const century = julianCentury(new Date('2010-06-21'));
    const orbit = orbitalTerms(century);
    const obliquity = obliquityCorrection(century);
    const apparent = apparentLongitude(century, orbit.meanLongitude, orbit.anomaly);
    expect(orbit.meanLongitude).toBeGreaterThanOrEqual(0);
    expect(orbit.meanLongitude).toBeLessThan(360);
    expect(obliquity).toBeGreaterThan(23);
    expect(obliquity).toBeLessThan(24);
    expect(solarDeclination(apparent, obliquity)).toBeGreaterThan(23);
    expect(equationOfTime({ ...orbit, obliquity })).toBeLessThan(5);
  });
});

describe('ventilation window selection', () => {
  it('accepts only hours within the half-width around solar noon', () => {
    expect(nearSolarNoon(10, position)).toBe(true);
    expect(nearSolarNoon(16, position)).toBe(true);
    expect(nearSolarNoon(9.9, position)).toBe(false);
  });

  it('selects the earliest longest run of true values', () => {
    expect(longestRun([false, true, true, false, true])).toEqual({ start: 1, end: 2 });
    expect(longestRun([true, true])).toEqual({ start: 0, end: 1 });
    expect(longestRun([false])).toBeNull();
    expect(longestRun([])).toBeNull();
  });

  it('opens only when cleaner air overlaps the solar window', () => {
    const outdoor = hours(Array.from({ length: 24 }, (_, hour) => (hour >= 10 && hour <= 12 ? 20 : 100)));
    expect(ventilationWindow(outdoor, micrograms(50), position)).toEqual({ open: true, startHour: 10, endHour: 12 });
    const nightOnly = hours(Array.from({ length: 24 }, (_, hour) => (hour === 5 ? 20 : 100)));
    expect(ventilationWindow(nightOnly, micrograms(50), position)).toEqual({ open: false, startHour: null, endHour: null });
  });
});
