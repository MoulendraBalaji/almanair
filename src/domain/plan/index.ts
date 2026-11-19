/** Pure orchestration of every on-device engine into one UI-ready plan. */
import { guidance } from '@/data';
import type { Reading } from '@/domain/aqi';
import { severityKey } from '@/domain/aqi';
import { profileExtremes } from '@/domain/exposure/profile';
import { planReceipt } from '@/domain/impact/receipt';
import type { Profile } from '@/domain/profile';
import { buildDigest } from './digest';
import { buildActions, buildCore, buildHours, buildSources, type PlanAction, type PlanCore, type PlanHour } from './build';
import { readingFor } from './reading';
import type { PlanSource } from './sources';
import type { Locale } from '@/data/messages';

export type { PlanAction, PlanHour } from './build';

/** The complete deterministic plan consumed by every P0 screen. */
export interface Plan {
  generatedAt: string;
  locale: Locale;
  hasReading: boolean;
  reading: Reading;
  severityKey: ReturnType<typeof severityKey>;
  standardId: string;
  standardLabelKey: string;
  location: PlanCore['location'];
  guidance: { id: string; generalKey: string; vulnerableKey: string };
  outdoor: PlanCore['outdoor'];
  extremes: ReturnType<typeof profileExtremes>;
  indoor: PlanCore['indoor'];
  ventilation: PlanCore['ventilation'];
  solar: PlanCore['solar'];
  usualSchedule: PlanCore['usual'];
  adjustedSchedule: PlanCore['adjusted'];
  hours: readonly PlanHour[];
  baselineDose: PlanCore['baselineDose'];
  adjustedDose: PlanCore['adjustedDose'];
  receipt: ReturnType<typeof planReceipt>;
  emissions: PlanCore['emissions'];
  actions: readonly PlanAction[];
  sources: readonly PlanSource[];
  digest: string;
}

const guidanceFor = (core: PlanCore): { id: string; generalKey: string; vulnerableKey: string } => {
  const entry = guidance.find((item) => item.severity === core.reading.severity) ?? guidance[0];
  if (!entry) throw new Error('No guidance is configured');
  return { id: entry.id, generalKey: entry.generalKey, vulnerableKey: entry.vulnerableKey };
};

const digestFor = (core: PlanCore, chosen: readonly PlanAction[]): string =>
  buildDigest({
    locale: core.profile.locale,
    reading: core.reading,
    standardLabelKey: core.standardLabelKey,
    location: core.location,
    householdSize: core.profile.household.length,
    vulnerableCount: core.profile.household.filter((member) => member.flags.length > 0).length,
    homeType: core.profile.home.type,
    roomCount: core.profile.home.rooms.length,
    largestRoomVolume: core.indoor.room.volume,
    hasPurifier: core.profile.home.hasPurifier,
    maskClass: core.profile.home.maskClass,
    usual: core.usual,
    adjusted: core.adjusted,
    exposureBefore: core.baselineDose.central,
    exposureAfter: core.adjustedDose.central,
    actions: chosen.map((item) => item.action),
  });

/** Builds the complete plan; identical profile and date inputs always match. */
export const buildPlan = (profile: Profile, date: Date): Plan => {
  const core = buildCore(profile, date);
  const chosen = buildActions(core);
  const guidanceEntry = guidanceFor(core);
  return {
    generatedAt: date.toISOString(),
    locale: profile.locale,
    hasReading: readingFor(profile) !== undefined,
    reading: core.reading,
    severityKey: severityKey(core.reading.severity),
    standardId: core.standardId,
    standardLabelKey: core.standardLabelKey,
    location: core.location,
    guidance: guidanceEntry,
    outdoor: core.outdoor,
    extremes: profileExtremes(core.outdoor),
    indoor: core.indoor,
    ventilation: core.ventilation,
    solar: core.solar,
    usualSchedule: core.usual,
    adjustedSchedule: core.adjusted,
    hours: buildHours(core),
    baselineDose: core.baselineDose,
    adjustedDose: core.adjustedDose,
    receipt: planReceipt({
      before: core.baselineDose,
      after: core.adjustedDose,
      emissionsBefore: core.emissions.before,
      emissionsAfter: core.emissions.after,
    }),
    emissions: core.emissions,
    actions: chosen,
    sources: buildSources(core, chosen),
    digest: digestFor(core, chosen),
  };
};
