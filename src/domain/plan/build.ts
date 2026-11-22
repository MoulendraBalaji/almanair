/** Internal composition helpers for the pure plan builder. */
import { config } from '@/config';
import { actions, guidance, standards } from '@/data';
import type { Action } from '@/data/catalogue-schema';
import type { Activity } from '@/domain/exposure/dose';
import { rankActions } from '@/domain/recommender/ranking';
import type { PlanCore } from './core';
import { effectFor, type ActionEffect, type EffectContext } from './effects';
import { factsFor } from './facts';
import { timeOfDayFor } from './schedule';
import { sourceForId, sourceRecord, uniqueSources, type PlanSource } from './sources';

export { buildCore } from './core';
export type { PlanCore } from './core';

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
