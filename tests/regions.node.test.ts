/** Sourced non-India regions and custom-location fallbacks for the on-device plan. */
import { describe, expect, it } from 'vitest';
import { regions, standards } from '@/data';
import { buildPlan } from '@/domain/plan';
import { defaultProfile, type Profile } from '@/domain/profile';

const instant = new Date('2026-01-15T06:00:00Z');

const withReading = (): Profile => ({
  ...defaultProfile(),
  reading: { kind: 'category', category: 3, standardId: 'india-cpcb' },
});

const sourcedPlaces = [
  {
    id: 'lahore',
    latitude: 31.558,
    longitude: 74.35071,
    timezone: 'Asia/Karachi',
    utcOffsetHours: 5,
    standardId: 'us-epa',
  },
  {
    id: 'dhaka',
    latitude: 23.7104,
    longitude: 90.40744,
    timezone: 'Asia/Dhaka',
    utcOffsetHours: 6,
    standardId: 'us-epa',
  },
  {
    id: 'kathmandu',
    latitude: 27.70169,
    longitude: 85.3206,
    timezone: 'Asia/Kathmandu',
    utcOffsetHours: 5.75,
    standardId: 'us-epa',
  },
  {
    id: 'beijing',
    latitude: 39.9075,
    longitude: 116.39723,
    timezone: 'Asia/Shanghai',
    utcOffsetHours: 8,
    standardId: 'us-epa',
  },
] as const;

const customLocation = {
  latitude: 31.558,
  longitude: 74.35071,
  utcOffsetHours: 5,
  timezone: 'Asia/Karachi',
  standardId: 'us-epa',
} as const;

describe('sourced non-India regions', () => {
  it('ships GeoNames-sourced places whose standards resolve', () => {
    const standardIds = new Set(standards.map((standard) => standard.id));
    for (const place of sourcedPlaces) {
      const region = regions.find((item) => item.id === place.id);
      expect(region, `${place.id} is registered`).toBeDefined();
      expect(region).toMatchObject(place);
      expect(region?.nameKey).toBe(`regions.${place.id}`);
      expect(region?.source.publisher).toBe('GeoNames');
      expect(region?.source.url).toMatch(/^https:\/\/www\.geonames\.org\/\d+\//);
      expect(region?.source.year).toBeGreaterThanOrEqual(2025);
      expect(standardIds.has(place.standardId), `${place.id} -> ${place.standardId}`).toBe(true);
    }
  });

  it('uses a selected region timezone and standard in the plan', () => {
    const profile = withReading();
    for (const place of sourcedPlaces) {
      profile.regionId = place.id;
      const plan = buildPlan(profile, instant);
      expect(plan.location.id).toBe(place.id);
      expect(plan.location).toMatchObject({
        timezone: place.timezone,
        utcOffsetHours: place.utcOffsetHours,
        standardId: place.standardId,
      });
    }
  });
});

describe('custom locations', () => {
  it('uses reviewed custom coordinates when the standard is known', () => {
    const profile: Profile = {
      ...withReading(),
      regionId: 'custom',
      customRegion: { ...customLocation },
      reading: { kind: 'category', category: 3, standardId: customLocation.standardId },
    };
    const plan = buildPlan(profile, instant);
    expect(plan.location).toMatchObject({
      id: 'custom',
      nameKey: 'regions.custom',
      ...customLocation,
    });
    expect(plan.standardId).toBe(customLocation.standardId);
  });

  it('falls back to the first region for an unknown standard and region', () => {
    const fallback = regions[0];
    const profile: Profile = {
      ...withReading(),
      regionId: 'unknown-region',
      customRegion: { ...customLocation, standardId: 'unknown-standard' },
    };
    const plan = buildPlan(profile, instant);
    expect(plan.location.id).toBe(fallback?.id);
    expect(plan.location.standardId).toBe(fallback?.standardId);
    expect(plan.standardId).toBe('india-cpcb');
    expect(plan.hours.length).toBeGreaterThan(0);
  });

  it('never includes custom coordinates in the private digest', () => {
    const profile: Profile = {
      ...withReading(),
      regionId: 'custom',
      customRegion: {
        latitude: 12.345678,
        longitude: -98.765432,
        utcOffsetHours: 5.75,
        timezone: 'Asia/Kathmandu',
        standardId: 'us-epa',
      },
    };
    const digest = buildPlan(profile, instant).digest;
    expect(digest.length).toBeGreaterThan(0);
    expect(digest).not.toContain('12.345678');
    expect(digest).not.toContain('98.765432');
    expect(digest).not.toContain('12.345');
    expect(digest).not.toContain('98.765');
  });
});
