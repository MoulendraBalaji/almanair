/** Pure ranking of lower-emission alternatives with the plan's own receipts. */
import { config } from '@/config';
import { actions } from '@/data';
import type { Action } from '@/data/catalogue-schema';
import type { Profile } from '@/domain/profile';
import { buildCore } from '@/domain/plan/build';
import { effectsFor, type ActionEffect } from '@/domain/plan/effects';
import { factsFor } from '@/domain/plan/facts';
import { timeOfDayFor } from '@/domain/plan/schedule';
import { actionScore, costRank, rankActions } from '@/domain/recommender/ranking';

/** Budget tier accepted by the Move filters. */
export type MoveBudget = keyof typeof costRank;

/** One scored alternative with its explainable receipt. */
export interface MoveAlternative {
  action: Action;
  effect: ActionEffect;
}

/** Named inputs for the pure ranking function. */
export interface MoveQuery {
  profile: Profile;
  date: Date;
  budget: MoveBudget;
  freeFirst: boolean;
}

/** Ranks applicable actions whose modelled weekly emissions actually fall. */
export const moveAlternatives = ({ profile, date, budget, freeFirst }: MoveQuery): readonly MoveAlternative[] => {
  const core = buildCore(profile, date);
  const context = {
    profile,
    outdoorConcentration: core.outdoorConcentration,
    outdoor: core.outdoor,
    indoor: core.indoor,
    schedule: core.usual,
    vehicleRatio: core.vehicleRatio,
    baselineDose: core.baselineDose,
    baselineEmissions: core.emissions.before,
  };
  const effects = effectsFor(context);
  const scoreFor = (action: Action): number => effects.get(action.id)?.score ?? 0;
  const ranked = rankActions({
    actions,
    facts: factsFor(profile, core.reading),
    timeOfDay: timeOfDayFor(core.localHour),
    budgetTier: budget,
    score: scoreFor,
    limit: actions.length,
  });
  const lowering = ranked.flatMap((action) => {
    const effect = effects.get(action.id);
    return effect && effect.receipt.emissionsDelta < 0 ? [{ action, effect }] : [];
  });
  const ordered = freeFirst
    ? [...lowering].sort((left, right) =>
      costRank[left.action.costTier] - costRank[right.action.costTier] || actionScore(right.action, scoreFor) - actionScore(left.action, scoreFor))
    : lowering;
  return ordered.slice(0, config.ui.moveAlternatives);
};
