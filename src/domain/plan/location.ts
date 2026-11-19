/** Resolves the profile's region or reviewed custom coordinates. */
import { config } from '@/config';
import { regions, standards } from '@/data';
import type { Profile } from '@/domain/profile';

/** The location inputs used by solar and standard calculations. */
export interface PlanLocation {
  id: string;
  nameKey: string;
  latitude: number;
  longitude: number;
  timezone: string;
  utcOffsetHours: number;
  standardId: string;
}

const firstRegion = (): (typeof regions)[number] => {
  const region = regions[0];
  if (!region) throw new Error('No regions are configured');
  return region;
};

/** Returns a reviewed region, or the custom location when it is complete. */
export const locationFor = (profile: Profile): PlanLocation => {
  const fallback = firstRegion();
  const custom = profile.customRegion;
  if (profile.regionId === 'custom' && custom && standards.some((item) => item.id === custom.standardId)) {
    return {
      id: 'custom',
      nameKey: 'regions.custom',
      latitude: custom.latitude,
      longitude: custom.longitude,
      timezone: custom.timezone,
      utcOffsetHours: custom.utcOffsetHours,
      standardId: custom.standardId,
    };
  }
  const region = regions.find((item) => item.id === profile.regionId) ?? fallback;
  return { ...region };
};

/** Converts a UTC instant into the local hour used by routine rules. */
export const localHourFor = (date: Date, utcOffsetHours: number): number => {
  const shifted = date.getUTCHours() + date.getUTCMinutes() / config.math.minutesPerHour + utcOffsetHours;
  const day = config.math.hoursPerDay;
  return ((Math.floor(shifted) % day) + day) % day;
};
