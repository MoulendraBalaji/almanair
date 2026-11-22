/** Shared sourced inputs computed once for every section of a plan. */
import { diurnalProfiles, standards } from '@/data';
import type { Reading } from '@/domain/aqi';
import type { Activity, DoseResult } from '@/domain/exposure/dose';
import { outdoorProfile, type HourlyPoint } from '@/domain/exposure/profile';
import type { Profile } from '@/domain/profile';
import { solarPosition, type SolarPosition } from '@/domain/ventilation/solar';
import { ventilationWindow, type VentilationWindow } from '@/domain/ventilation/window';
import { doseContextFor, doseFor, vehicleRatioFor } from './dose';
import { emissionsFor, type EmissionsSnapshot } from './emissions';
import type { FactorRange } from './factors';
import { indoorFor, type IndoorSnapshot } from './indoor';
import { localHourFor, locationFor, type PlanLocation } from './location';
import { readingOrBaseline } from './reading';
import { baseSchedule, quietSchedule } from './schedule';

/** Shared intermediate values used by every plan section. */
export interface PlanCore {
  profile: Profile;
  location: PlanLocation;
  reading: Reading;
  standardId: string;
  standardLabelKey: string;
  outdoorConcentration: Reading['concentration'];
  outdoor: readonly HourlyPoint[];
  indoor: IndoorSnapshot;
  usual: readonly Activity[];
  adjusted: readonly Activity[];
  solar: SolarPosition;
  ventilation: VentilationWindow;
  baselineDose: DoseResult;
  adjustedDose: DoseResult;
  vehicleRatio: FactorRange;
  emissions: EmissionsSnapshot;
  localHour: number;
}

/** Derives the ordinary and quiet-day activity schedules. */
const schedulesFor = (profile: Profile, reading: Reading): { usual: readonly Activity[]; adjusted: readonly Activity[] } => {
  const distance = profile.mobility.schoolRunKm + profile.mobility.commuteKm;
  const hasTrip = distance > 0 && profile.mobility.modes.some((mode) => mode !== 'walk');
  const usual = baseSchedule(hasTrip);
  return { usual, adjusted: quietSchedule(usual, reading.severity) };
};

/** Computes the sun position used by the ventilation rule. */
const solarFor = (location: PlanLocation, date: Date): SolarPosition =>
  solarPosition({
    latitude: location.latitude,
    longitude: location.longitude,
    date,
    timezoneOffsetHours: location.utcOffsetHours,
  });

/** Builds all sourced inputs once so every screen reads identical values. */
export const buildCore = (profile: Profile, date: Date): PlanCore => {
  const location = locationFor(profile);
  const reading = readingOrBaseline(profile);
  const readingStandardId = profile.reading?.standardId ?? profile.preferences.standardId;
  const standard =
    standards.find((item) => item.id === readingStandardId) ?? standards.find((item) => item.id === profile.preferences.standardId);
  if (!standard) throw new Error('No AQI standard is configured');
  const diurnal = diurnalProfiles.find((item) => item.id === profile.preferences.diurnalProfileId) ?? diurnalProfiles[0];
  if (!diurnal) throw new Error('No diurnal profile is configured');
  const outdoor = outdoorProfile(reading.concentration, diurnal);
  const indoor = indoorFor(profile, reading.concentration);
  const { usual, adjusted } = schedulesFor(profile, reading);
  const solar = solarFor(location, date);
  const emissions = emissionsFor(profile);
  const baselineDose = doseFor(doseContextFor({ profile, outdoor, indoor, schedule: usual }));
  const adjustedDose = doseFor(doseContextFor({ profile, outdoor, indoor, schedule: adjusted }));
  return {
    profile,
    location,
    reading,
    standardId: standard.id,
    standardLabelKey: standard.labelKey,
    outdoorConcentration: reading.concentration,
    outdoor,
    indoor,
    usual,
    adjusted,
    solar,
    ventilation: ventilationWindow(outdoor, indoor.central, solar),
    baselineDose,
    adjustedDose,
    vehicleRatio: vehicleRatioFor(profile),
    emissions,
    localHour: localHourFor(date, location.utcOffsetHours),
  };
};
