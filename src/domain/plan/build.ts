/** Internal composition helpers for the pure plan builder. */
import { config } from '@/config';
import { actions, diurnalProfiles, guidance, standards } from '@/data';
import type { Action } from '@/data/catalogue-schema';
import type { Reading } from '@/domain/aqi';
import { outdoorProfile, type HourlyPoint } from '@/domain/exposure/profile';
import type { Activity, DoseResult } from '@/domain/exposure/dose';
import { rankActions } from '@/domain/recommender/ranking';
import { solarPosition, type SolarPosition } from '@/domain/ventilation/solar';
import { ventilationWindow, type VentilationWindow } from '@/domain/ventilation/window';
import { doseContextFor, doseFor, vehicleRatioFor } from './dose';
import { effectFor, type ActionEffect, type EffectContext } from './effects';
import { emissionsFor, type EmissionsSnapshot } from './emissions';
import type { FactorRange } from './factors';
import { indoorFor, type IndoorSnapshot } from './indoor';
import { factsFor } from './facts';
import { localHourFor, locationFor, type PlanLocation } from './location';
import { readingOrBaseline } from './reading';
import { baseSchedule, quietSchedule, timeOfDayFor } from './schedule';
import { sourceForId, sourceRecord, uniqueSources, type PlanSource } from './sources';
import type { Profile } from '@/domain/profile';

/** One ranked action and its receipt. */
export interface PlanAction {
  action: Action;
  effect: ActionEffect;
}

/** One hour of the household's day. */
export interface PlanHour {
  hour: number;
  outdoor: number;
  usualActivity: Activity;
  adjustedActivity: Activity;
  usualDose: number;
  adjustedDose: number;
}

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

/** Joins hourly outdoor, activity and dose data into a chart-ready table. */
export const buildHours = (core: PlanCore): readonly PlanHour[] =>
  core.outdoor.map((point, index) => ({
    hour: point.hour,
    outdoor: point.concentration,
    usualActivity: core.usual[index] ?? 'indoor',
    adjustedActivity: core.adjusted[index] ?? 'indoor',
    usualDose: core.baselineDose.hourly[index] ?? 0,
    adjustedDose: core.adjustedDose.hourly[index] ?? 0,
  }));

/** Scores every action once, then returns the ranked, budget-filtered shortlist. */
export const buildActions = (core: PlanCore): readonly PlanAction[] => {
  const effectContext: EffectContext = {
    profile: core.profile,
    outdoorConcentration: core.outdoorConcentration,
    outdoor: core.outdoor,
    indoor: core.indoor,
    schedule: core.usual,
    vehicleRatio: core.vehicleRatio,
    baselineDose: core.baselineDose,
    baselineEmissions: core.emissions.before,
  };
  const effects = new Map(actions.map((action) => [action.id, effectFor(action, effectContext)]));
  const ranked = rankActions({
    actions,
    facts: factsFor(core.profile, core.reading),
    timeOfDay: timeOfDayFor(core.localHour),
    budgetTier: core.profile.budgetTier,
    score: (action) => effects.get(action.id)?.score ?? 0,
    limit: config.ui.topActions,
  });
  return ranked.flatMap((action) => {
    const effect = effects.get(action.id);
    return effect ? [{ action, effect }] : [];
  });
};

/** Collects every source used by the plan, in a stable order. */
export const buildSources = (core: PlanCore, chosen: readonly PlanAction[]): readonly PlanSource[] => {
  const entry = guidance.find((item) => item.severity === core.reading.severity) ?? guidance[0];
  if (!entry) throw new Error('No guidance is configured');
  const standardSource = standards.find((item) => item.id === core.standardId)?.source ?? entry.source;
  const ids = [...core.indoor.sourceIds, ...core.emissions.sourceIds, ...chosen.flatMap((item) => item.effect.sourceIds)];
  return uniqueSources([
    sourceRecord(core.standardId, standardSource),
    sourceRecord(entry.id, entry.source),
    sourceForId('noaa-solar'),
    sourceForId('geonames'),
    ...ids.map(sourceForId),
  ]);
};
