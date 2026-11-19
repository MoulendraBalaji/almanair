/** Deterministic ranking: benefit per effort, budget-filtered and category-diversified. */
import type { Action } from '@/data/catalogue-schema';
import { applicableActions, type Facts, type TimeOfDay } from './predicate';

/** Cost and effort orderings are ranks, never prices. */
export const costRank = { free: 0, low: 1, medium: 2, high: 3 } satisfies Record<string, number>;
/** Effort ordering used as the ranking denominator. */
export const effortRank = { low: 1, medium: 2, high: 3 } satisfies Record<string, number>;

/** Inputs to ranking; the score callback comes from the impact engine. */
export interface RankOptions {
  actions: readonly Action[];
  facts: Facts;
  timeOfDay: TimeOfDay;
  budgetTier: keyof typeof costRank;
  score: (action: Action) => number;
  limit: number;
}

/** Benefit per unit effort, with a tiny stable tie-break by id. */
export const actionScore = (action: Action, score: (action: Action) => number): number => {
  const benefit = score(action);
  const tieBreak = action.id.length / Number.MAX_SAFE_INTEGER;
  return benefit / effortRank[action.effort] + tieBreak;
};

/** Selects, filters, scores and diversifies actions for a user. */
export const rankActions = (options: RankOptions): readonly Action[] => {
  const allowed = applicableActions(options.actions, options.facts, options.timeOfDay).filter(
    (action) => costRank[action.costTier] <= costRank[options.budgetTier],
  );
  const sorted = [...allowed].sort((left, right) => actionScore(right, options.score) - actionScore(left, options.score));
  const picked: Action[] = [];
  const seen = new Set<string>();
  for (const action of sorted) {
    if (picked.length >= options.limit) break;
    if (seen.has(action.category)) continue;
    picked.push(action);
    seen.add(action.category);
  }
  return picked;
};
